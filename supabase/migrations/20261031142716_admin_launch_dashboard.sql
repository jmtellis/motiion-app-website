-- Shared web / iOS launch dashboard. No targets or exclusions are seeded.
create table public.admin_launch_goals (
  id uuid primary key default gen_random_uuid(),
  metric_key text not null unique check (metric_key in ('ready_talent','approved_industry','opportunities','review_backlog','review_days')),
  target numeric not null check (target >= 0 and target < 1e15),
  owner_name text not null check (length(trim(owner_name)) between 1 and 200),
  deadline date not null,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid not null default auth.uid() references auth.users(id)
);
create table public.admin_launch_goal_history (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.admin_launch_goals(id) on delete cascade,
  current_value numeric,
  target numeric not null,
  owner_name text not null,
  deadline date not null,
  recorded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.admin_analytics_exclusions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text not null check (length(trim(reason)) between 1 and 500),
  added_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
DO $$ declare t text; begin
  foreach t in array array['admin_launch_goals','admin_launch_goal_history','admin_analytics_exclusions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('create policy staff_read on public.%I for select to authenticated using (public.auth_is_platform_admin())', t);
  end loop;
end $$;

-- Bounded, authorized source contract; source failure is explicit, never an empty success.
create function public.admin_launch_snapshot(p_days integer default 30) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  t text; payload jsonb; n integer; sources jsonb := '{}';
  days integer := case when p_days in (7,30,90) then p_days else 30 end;
  cutoff timestamptz; predicate text;
begin
  if auth.uid() is null or not coalesce(public.auth_is_platform_admin(),false) then raise exception 'not authorized' using errcode='42501'; end if;
  cutoff := now() - make_interval(days => greatest(days * 2,60));
  foreach t in array array['profiles','non_talent_profiles','professional_profiles','projects','activities','castings','talent_lists','talent_list_members','saved_searches','resume_parse_runs','subscriptions','identity_verification_fee_payments','booking_deal_memos','stripe_checkout_sessions','enrollments','industry_applications','industry_application_reviews','profile_review_requests','admin_launch_goals','admin_launch_goal_history','admin_analytics_exclusions','analytics_events'] loop
    begin
      predicate := case when t='analytics_events' then format('where created_at >= %L and created_at < %L',cutoff,now()) else '' end;
      execute format('select coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb), count(*) from (select * from public.%I %s limit 100001) r', t, predicate) into payload,n;
      if n > 100000 then
        sources := sources || jsonb_build_object(t,jsonb_build_object('rows','[]'::jsonb,'error','Source exceeds dashboard read limit; aggregate required.'));
      else
        sources := sources || jsonb_build_object(t,jsonb_build_object('rows',payload,'error',null));
      end if;
    exception when undefined_table or undefined_column or insufficient_privilege then
      sources := sources || jsonb_build_object(t,jsonb_build_object('rows','[]'::jsonb,'error','Source unavailable; check migration coverage.'));
    end;
  end loop;
  return jsonb_build_object('sources', sources, 'fetchedAt',now(),'since',now()-make_interval(days=>days),'previousSince',cutoff,'days',days,'preview',false);
end $$;
revoke all on function public.admin_launch_snapshot(integer) from public, anon;
grant execute on function public.admin_launch_snapshot(integer) to authenticated;

create function public.admin_save_launch_goal(p_metric text,p_target numeric,p_owner text,p_deadline date,p_version integer,p_current numeric default null) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare g public.admin_launch_goals;
begin
  if auth.uid() is null or not coalesce(public.auth_is_platform_admin(),false) then raise exception 'not authorized' using errcode='42501'; end if;
  -- Serialize create and update; reject an editor opened before another admin saved.
  perform pg_advisory_xact_lock(hashtextextended('launch_goal:'||p_metric,0));
  select * into g from public.admin_launch_goals where metric_key=p_metric for update;
  if coalesce(g.version,0) <> p_version then raise exception 'Goal changed. Refresh before saving.' using errcode='PT409'; end if;
  insert into public.admin_launch_goals(metric_key,target,owner_name,deadline)
    values(p_metric,p_target,trim(p_owner),p_deadline)
    on conflict(metric_key) do update set target=excluded.target,owner_name=excluded.owner_name,deadline=excluded.deadline,version=admin_launch_goals.version+1,updated_at=now(),updated_by=auth.uid()
    returning * into g;
  -- Explicit admin observation at save time, not a scheduled or immutable financial snapshot.
  insert into public.admin_launch_goal_history(goal_id,current_value,target,owner_name,deadline,recorded_by)
    values(g.id,p_current,g.target,g.owner_name,g.deadline,auth.uid());
end $$;
revoke all on function public.admin_save_launch_goal(text,numeric,text,date,integer,numeric) from public, anon;
grant execute on function public.admin_save_launch_goal(text,numeric,text,date,integer,numeric) to authenticated;

create function public.admin_set_analytics_exclusion(p_user_id uuid,p_reason text,p_excluded boolean) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not coalesce(public.auth_is_platform_admin(),false) then raise exception 'not authorized' using errcode='42501'; end if;
  if p_excluded then
    insert into public.admin_analytics_exclusions(user_id,reason) values(p_user_id,trim(p_reason))
      on conflict(user_id) do update set reason=excluded.reason,added_by=auth.uid(),created_at=now();
  else delete from public.admin_analytics_exclusions where user_id=p_user_id;
  end if;
end $$;
revoke all on function public.admin_set_analytics_exclusion(uuid,text,boolean) from public,anon;
grant execute on function public.admin_set_analytics_exclusion(uuid,text,boolean) to authenticated;

-- Lock the same profile row as submit/review, compare the request actually previewed,
-- then preserve the existing decision, feedback, notification and authorization logic.
create function public.admin_review_profile_request(p_user_id uuid,p_request_id uuid,p_action text,p_feedback text default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare current_request uuid; result jsonb;
begin
  if auth.uid() is null or not coalesce(public.auth_is_platform_admin(),false) then raise exception 'not authorized' using errcode='42501'; end if;
  perform 1 from public.profiles where user_id=p_user_id for update;
  select id into current_request from public.profile_review_requests where user_id=p_user_id and status='pending' order by submitted_at desc limit 1 for update;
  if current_request is null or current_request is distinct from p_request_id then raise exception 'Review changed. Refresh the inbox.' using errcode='PT409'; end if;
  result := public.review_profile(p_user_id,p_action,p_feedback);
  -- The legacy RPC may return an error after writes. Raising rolls back the transaction.
  if result->>'ok' is distinct from 'true' then raise exception '%',coalesce(result->>'error','Review failed') using errcode='PT409'; end if;
  return result;
end $$;
revoke all on function public.admin_review_profile_request(uuid,uuid,text,text) from public,anon;
grant execute on function public.admin_review_profile_request(uuid,uuid,text,text) to authenticated;
notify pgrst, 'reload schema';
