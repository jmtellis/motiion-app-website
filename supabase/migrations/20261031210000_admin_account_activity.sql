-- Prepared locally only. Not applied to staging or production.
-- Narrow admin-only lifetime account relationships. No table/policy/account changes.
create or replace function public.admin_account_activity(p_user_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare k text; q text; payload jsonb; n integer; sources jsonb := '{}';
begin
  if auth.uid() is null or not coalesce(public.auth_is_platform_admin(),false) then
    raise exception 'not authorized' using errcode='42501';
  end if;
  if p_user_id is null then raise exception 'account required' using errcode='22023'; end if;
  foreach k in array array['user_referrals','session_join_requests','activity_invites','project_members','project_participants','submissions','bookings'] loop
    q := case k
      when 'user_referrals' then 'select id,referrer_user_id,referee_user_id,created_at,source from public.user_referrals where referrer_user_id=$1 or referee_user_id=$1'
      when 'session_join_requests' then 'select id,activity_id,requester_id,status,created_at from public.session_join_requests where requester_id=$1'
      when 'activity_invites' then 'select id,activity_id,invited_user_id,is_active,response_status,created_at from public.activity_invites where invited_user_id=$1'
      when 'project_members' then 'select id,project_id,user_id,role,created_at from public.project_members where user_id=$1'
      when 'project_participants' then 'select id,project_id,user_id,added_at,removed_at from public.project_participants where user_id=$1'
      when 'submissions' then 'select s.id,s.talent_id,s.role_id,s.status,s.submitted_at,jsonb_build_object(''id'',r.id,''casting_id'',r.casting_id,''title'',r.title) as roles from public.submissions s left join public.roles r on r.id=s.role_id where s.talent_id=$1'
      when 'bookings' then 'select id,project_id,talent_user_id,industry_user_id,status,work_title,completed_at,created_at from public.bookings where talent_user_id=$1 or industry_user_id=$1'
    end;
    begin
      execute 'select coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb),count(*) from (' || q || ' order by id limit 100001) r'
        into payload,n using p_user_id;
      sources := sources || jsonb_build_object(k,case when n>100000
        then jsonb_build_object('rows','[]'::jsonb,'error','Incomplete account coverage; totals withheld.')
        else jsonb_build_object('rows',payload,'error',null) end);
    exception when undefined_table or undefined_column or insufficient_privilege then
      sources := sources || jsonb_build_object(k,jsonb_build_object('rows','[]'::jsonb,'error','Account source unavailable.'));
    end;
  end loop;
  return jsonb_build_object('sources',sources);
end $$;
revoke all on function public.admin_account_activity(uuid) from public,anon;
grant execute on function public.admin_account_activity(uuid) to authenticated;
