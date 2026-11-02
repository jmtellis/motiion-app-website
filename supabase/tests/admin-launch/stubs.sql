create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function public.auth_is_platform_admin() returns boolean language sql stable as $$select auth.uid()='00000000-0000-0000-0000-000000000001'::uuid$$;
grant usage on schema auth to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
create table public.profiles(user_id uuid primary key,profile_review_status text);
create table public.profile_review_requests(id uuid primary key,user_id uuid,status text,submitted_at timestamptz);
create function public.review_profile(p_user_id uuid,p_action text,p_feedback text) returns jsonb language plpgsql as $$
begin
 if p_user_id=auth.uid() then return '{"ok":false,"error":"invalid_target"}'; end if;
 update public.profiles set profile_review_status=p_action where user_id=p_user_id;
 if p_action='fail_after_write' then return '{"ok":false,"error":"messaging_failed"}'; end if;
 update public.profile_review_requests set status=p_action where user_id=p_user_id and status='pending';
 return '{"ok":true}';
end$$;
insert into auth.users values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
insert into public.profiles values('00000000-0000-0000-0000-000000000002','pending');
insert into public.profile_review_requests values('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','pending',now());
