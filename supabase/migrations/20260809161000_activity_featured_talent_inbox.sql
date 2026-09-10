-- Wire featured talent invites into list_pending_requests / respond_to_request
-- without rewriting the large core functions: rename core, wrap with UNION / dispatch.

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'list_pending_requests'
      and pg_get_function_identity_arguments(p.oid) in ('integer', 'p_limit integer')
  ) and not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'list_pending_requests_core'
  ) then
    alter function public.list_pending_requests(integer)
      rename to list_pending_requests_core;
  end if;
end $$;

create or replace function public.list_pending_requests(p_limit int default 20)
returns table (
  id uuid,
  request_kind text,
  title text,
  header_text text,
  detail_text text,
  cover_url text,
  inviter_user_id uuid,
  inviter_name text,
  inviter_avatar_url text,
  ref_activity_id uuid,
  ref_role_id uuid,
  ref_job_id uuid,
  ref_job_group_id uuid,
  ref_workspace_job_id uuid,
  actor_role text,
  activity_requires_payment boolean,
  sort_key timestamptz
)
language plpgsql
security definer
stable
set search_path = public, auth
as $fn$
begin
  return query
  select * from (
    select * from public.list_pending_requests_core(100)
    union all
    select
      aft.id,
      'activity_featured_talent'::text,
      a.title,
      (coalesce(pinv.display_name, pinv.first_name || ' ' || coalesce(pinv.last_name, ''), 'Host')
        || ' invited you to be featured at')::text,
      coalesce(
        nullif(
          trim(
            both from coalesce(a.activity_date::text, '')
              || case
                when a.start_time is not null and trim(a.start_time::text) <> ''
                  then ' · ' || left(trim(a.start_time::text), 5)
                else ''
              end
          ),
          ''
        ),
        case when aft.parent_id is null then 'Featured talent' else 'Supporting talent' end
      )::text,
      a.cover_image_url,
      coalesce(aft.invited_by_user_id, a.creator_id),
      coalesce(
        nullif(trim(both from pinv.display_name), ''),
        nullif(trim(both from pinv.first_name || ' ' || coalesce(pinv.last_name, '')), ''),
        'Host'
      ),
      (pinv.headshot_urls #>> '{0}')::text,
      a.id,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      'invitee',
      false,
      aft.created_at
    from public.activity_featured_talent aft
    join public.activities a on a.id = aft.activity_id
    left join public.profiles pinv on pinv.user_id = coalesce(aft.invited_by_user_id, a.creator_id)
    where aft.talent_user_id = auth.uid()
      and aft.status = 'pending'
      and coalesce(a.status, 'active') = 'active'
  ) as combined
  order by sort_key desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
end;
$fn$;

revoke all on function public.list_pending_requests(int) from public;
grant execute on function public.list_pending_requests(int) to authenticated;

do $$
declare
  v_args text;
begin
  -- Rename the latest respond_to_request overload (5-arg with response note) if present.
  select pg_get_function_identity_arguments(p.oid) into v_args
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'respond_to_request'
  order by p.pronargs desc
  limit 1;

  if v_args is not null and not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'respond_to_request_core'
  ) then
    execute format(
      'alter function public.respond_to_request(%s) rename to respond_to_request_core',
      v_args
    );
  end if;
end $$;

create or replace function public.respond_to_request(
  p_request_kind text,
  p_source_id uuid,
  p_action text,
  p_response_kind text default null,
  p_response_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_request_kind = 'activity_featured_talent' then
    return public.respond_activity_featured_talent(p_source_id, p_action);
  end if;

  return public.respond_to_request_core(
    p_request_kind,
    p_source_id,
    p_action,
    p_response_kind,
    p_response_note
  );
end;
$$;

revoke all on function public.respond_to_request(text, uuid, text, text, text) from public;
grant execute on function public.respond_to_request(text, uuid, text, text, text) to authenticated;
