-- Shared account purchases. Clients may read their own receipts, never grant access.
create schema if not exists project_billing;
revoke all on schema project_billing from public, anon, authenticated;
create table public.project_purchases (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null check(provider in ('stripe','apple_iap')),
 external_id text not null,
 plan text not null check(plan in ('project_pass','studio','production_house')),
 status text not null check(status in ('active','inactive','revoked')),
 expires_at timestamptz,
 project_id uuid, -- durable: deleting a project does not recycle a pass
 activated_at timestamptz,
 event_at timestamptz not null,
 created_at timestamptz not null default now(),
 unique(provider, external_id),
 check(plan='project_pass' or expires_at is not null)
);
create index project_purchases_owner on public.project_purchases(user_id);
create unique index project_pass_assignment on public.project_purchases(project_id) where project_id is not null and plan='project_pass';
alter table public.project_purchases enable row level security;
create policy own_receipts on public.project_purchases for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.project_purchases from anon,authenticated;
grant select on public.project_purchases to authenticated;
grant all on public.project_purchases to service_role;

create function public.sync_project_purchase(p_user_id uuid,p_provider text,p_external_id text,p_plan text,p_status text,p_expires_at timestamptz,p_event_at timestamptz)
returns void language plpgsql security definer set search_path='' as $$
declare prior public.project_purchases;
begin
 if p_user_id is null or p_external_id is null or p_event_at is null then raise exception 'Invalid receipt'; end if;
 perform pg_advisory_xact_lock(hashtextextended('project-billing:'||p_user_id::text,0));
 select * into prior from public.project_purchases where provider=p_provider and external_id=p_external_id for update;
 if found then
  if prior.user_id<>p_user_id then raise exception 'Receipt belongs to another account'; end if;
  if prior.event_at>p_event_at or (prior.status='revoked' and p_plan='project_pass') then return; end if;
 end if;
 insert into public.project_purchases(user_id,provider,external_id,plan,status,expires_at,event_at)
 values(p_user_id,p_provider,p_external_id,p_plan,p_status,p_expires_at,p_event_at)
 on conflict(provider,external_id) do update set plan=excluded.plan,status=excluded.status,
 expires_at=case when excluded.plan='project_pass' then project_purchases.expires_at else excluded.expires_at end,event_at=excluded.event_at;
end $$;
revoke all on function public.sync_project_purchase(uuid,text,text,text,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.sync_project_purchase(uuid,text,text,text,text,timestamptz,timestamptz) to service_role;

-- Preserve the established legacy paid-plan contract without converting subscribers.
alter function public.account_pro_status(uuid) rename to account_pro_status_before_project_plans;
create function public.account_pro_status(p_user_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select public.account_pro_status_before_project_plans(p_user_id) || jsonb_build_object('industry',
 coalesce((public.account_pro_status_before_project_plans(p_user_id)->>'industry')::boolean,false)
 or exists(select 1 from public.project_purchases where user_id=p_user_id and status='active' and (expires_at>now() or (plan='project_pass' and activated_at is null))));
$$;

create function project_billing.monthly_limit(uid uuid) returns int language sql stable security definer set search_path='' as $$
 select case when (public.account_pro_status_before_project_plans(uid)->>'industry')::boolean then 2147483647 else
 coalesce((select max(case plan when 'production_house' then 5 when 'studio' then 1 else 0 end) from public.project_purchases where user_id=uid and status='active' and expires_at>now()),0) end;
$$;
create function project_billing.is_active(p public.projects) returns boolean language sql stable set search_path='' as $$
 select coalesce(p.is_active,true) and coalesce(p.casting_configuration->>'composer_draft','false')<>'true';
$$;
create function public.account_project_access() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid(); lim int; used int;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 lim:=project_billing.monthly_limit(uid);
 select count(*) into used from public.projects p where p.poster_id=uid and project_billing.is_active(p)
 and not exists(select 1 from public.project_purchases g where g.project_id=p.id and g.plan='project_pass' and g.status='active' and g.expires_at>now());
 return jsonb_build_object('monthly_limit',lim,'active_projects',used,'legacy',lim=2147483647,
 'purchases',coalesce((select jsonb_agg(jsonb_build_object('id',id,'plan',plan,'provider',provider,'status',status,'expires_at',expires_at,'project_id',project_id,'activated_at',activated_at)) from public.project_purchases where user_id=uid),'[]'::jsonb));
end $$;
revoke all on function public.account_project_access() from public,anon;
grant execute on function public.account_project_access() to authenticated;

create function project_billing.assert_capacity(uid uuid,pid uuid) returns void language plpgsql security definer set search_path='' as $$
declare lim int; used int; pass uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('project-billing:'||uid::text,0));
 if exists(select 1 from public.project_purchases where project_id=pid and user_id=uid and plan='project_pass' and status='active' and expires_at>now()) then return; end if;
 lim:=project_billing.monthly_limit(uid);
 select count(*) into used from public.projects p where p.poster_id=uid and p.id<>pid and project_billing.is_active(p)
 and not exists(select 1 from public.project_purchases g where g.project_id=p.id and g.plan='project_pass' and g.status='active' and g.expires_at>now());
 if used<lim then return; end if;
 -- An unused pass is consumed only after monthly capacity is exhausted.
 select id into pass from public.project_purchases where user_id=uid and plan='project_pass' and status='active' and project_id is null order by created_at limit 1 for update;
 if pass is not null and not exists(select 1 from public.project_purchases where project_id=pid) then
  update public.project_purchases set project_id=pid,activated_at=now(),expires_at=now()+interval '90 days' where id=pass;
  return;
 end if;
 raise exception 'Your plan has no available active project slots. Archive a project or purchase a Project Pass.' using errcode='P0001',hint='project_capacity_required';
end $$;
create function project_billing.guard_project() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and new.poster_id is distinct from old.poster_id then raise exception 'Project ownership cannot change'; end if;
 if project_billing.is_active(new) then perform project_billing.assert_capacity(new.poster_id,new.id); end if;
 return new;
end $$;
create trigger a_project_capacity before insert or update on public.projects for each row execute function project_billing.guard_project();

-- Enforce capacity for direct role writes too, including old mobile clients.
create function project_billing.guard_role() returns trigger language plpgsql security definer set search_path='' as $$
declare p public.projects;
begin
 select * into p from public.projects where id=new.project_id;
 if p.id is not null and project_billing.is_active(p) then perform project_billing.assert_capacity(p.poster_id,p.id); end if;
 return new;
end $$;
create trigger a_project_role_capacity before insert or update on public.roles for each row execute function project_billing.guard_role();
revoke all on all functions in schema project_billing from public,anon,authenticated;
