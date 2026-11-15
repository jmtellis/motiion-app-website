-- Existing industry approval remains required to create a project. Accepted admins
-- can manage their own project; coordinators can only reach the narrow schedule RPC.
create or replace function public.guard_industry_project_write() returns trigger language plpgsql security definer set search_path='' as $$
declare row_data jsonb;
begin
 if tg_op='UPDATE' then
  if exists(select 1 from public.project_members m join public.project_workspace_invitations i on i.project_id=m.project_id and i.accepted_by=m.user_id where m.project_id=old.id and m.user_id=auth.uid() and m.role='admin' and i.role='admin') then return new; end if;
  if public.project_team_role(old.id)='coordinator'
   and (to_jsonb(new)-array['project_details','casting_configuration','updated_at']) is not distinct from (to_jsonb(old)-array['project_details','casting_configuration','updated_at'])
   and (coalesce(new.project_details,'{}')-'schedule_categories') is not distinct from (coalesce(old.project_details,'{}')-'schedule_categories')
   and (coalesce(new.casting_configuration,'{}')-'schedule_categories') is not distinct from (coalesce(old.casting_configuration,'{}')-'schedule_categories') then return new; end if;
 end if;
 row_data:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 if tg_op='INSERT' and auth.uid() is not null and coalesce(current_setting('motiion.featured_workspace_owner',true),'')=auth.uid()::text and new.poster_id=auth.uid() then return new; end if;
 if tg_op<>'INSERT' and public.is_featured_workspace_project(old.id) then if tg_op='DELETE' then return old; end if; return new; end if;
 if auth.uid() is not null and not public.has_industry_approval(auth.uid()) and not public.auth_is_platform_admin()
 and (coalesce(row_data->>'project_type','') in ('casting','job') or coalesce((row_data->>'is_composable')::boolean,false)
 or (tg_op='UPDATE' and (to_jsonb(old)->>'project_type' in ('casting','job') or coalesce((to_jsonb(old)->>'is_composable')::boolean,false)))) then raise exception 'Your industry application must be approved before creating or managing projects.' using errcode='42501'; end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
revoke all on function public.guard_industry_project_write() from public,anon,authenticated;

