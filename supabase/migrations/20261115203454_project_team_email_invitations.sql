-- Team roles are scoped to a project. Coordinators never enter the legacy admin permission graph.
create table public.project_coordinators (
 project_id uuid not null references public.projects(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 job_title text not null default '' check(length(job_title)<=100),
 primary key(project_id,user_id)
);
create index project_coordinators_user on public.project_coordinators(user_id);
alter table public.project_coordinators enable row level security;
revoke all on public.project_coordinators from public,anon,authenticated;
grant all on public.project_coordinators to service_role;
alter table public.project_members add column if not exists job_title text not null default '';
alter table public.project_workspace_invitations drop constraint project_workspace_invitations_role_check;
alter table public.project_workspace_invitations drop constraint project_workspace_invitations_check;
alter table public.project_workspace_invitations add constraint project_workspace_invitations_role_check check(role in ('participant','admin','coordinator'));
alter table public.project_workspace_invitations add constraint project_workspace_invitations_check check((role='participant' and email='') or (role in ('admin','coordinator') and email=lower(trim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'));
alter table public.project_workspace_invitations add column job_title text not null default '' check(length(job_title)<=100);
alter table public.project_workspace_invitations add column last_sent_at timestamptz;

create table public.project_seat_purchases (
 external_id text primary key, user_id uuid not null references auth.users(id),
 project_id uuid references public.projects(id) on delete cascade,
 quantity int not null check(quantity between 0 and 100), status text not null check(status in ('active','inactive','revoked')),
 expires_at timestamptz not null, event_at timestamptz not null
);
create index project_seat_purchases_owner on public.project_seat_purchases(user_id);
create index project_seat_purchases_project on public.project_seat_purchases(project_id) where project_id is not null;
alter table public.project_seat_purchases enable row level security;
revoke all on public.project_seat_purchases from public,anon,authenticated;
grant all on public.project_seat_purchases to service_role;
create function public.sync_project_seats(p_external_id text,p_user_id uuid,p_project_id uuid,p_quantity int,p_status text,p_expires_at timestamptz,p_event_at timestamptz) returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('project-billing:'||p_user_id::text,0));
 if exists(select 1 from public.project_seat_purchases where external_id=p_external_id and user_id<>p_user_id) then raise exception 'Purchase owner mismatch'; end if;
 if p_project_id is not null and not exists(select 1 from public.projects where id=p_project_id and poster_id=p_user_id) then raise exception 'Project owner mismatch'; end if;
 insert into public.project_seat_purchases values(p_external_id,p_user_id,p_project_id,p_quantity,p_status,p_expires_at,p_event_at)
 on conflict(external_id) do update set quantity=excluded.quantity,status=excluded.status,expires_at=excluded.expires_at,event_at=excluded.event_at
 where project_seat_purchases.event_at<=excluded.event_at and (project_seat_purchases.status<>'revoked' or (project_seat_purchases.project_id is null and excluded.expires_at>project_seat_purchases.expires_at));
end $$;
revoke all on function public.sync_project_seats(text,uuid,uuid,int,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.sync_project_seats(text,uuid,uuid,int,text,timestamptz,timestamptz) to service_role;

create function project_billing.require_paid_project(pid uuid) returns void language plpgsql security definer set search_path='' as $$
declare owner_id uuid; lim int; used int;
begin
 select poster_id into owner_id from public.projects where id=pid and coalesce(is_active,true);
 if owner_id is null then raise exception 'This project is archived or unavailable.'; end if;
 if exists(select 1 from public.project_purchases where project_id=pid and user_id=owner_id and status='active' and expires_at>now()) then return; end if;
 lim:=project_billing.monthly_limit(owner_id);
 select count(*) into used from public.projects p where p.poster_id=owner_id and project_billing.is_active(p) and not exists(select 1 from public.project_purchases s where s.project_id=p.id and s.status='active' and s.expires_at>now());
 if lim<=0 or used>lim then raise exception 'The project owner needs active paid project capacity.' using errcode='P0001',hint='project_capacity_required'; end if;
end $$;

create function public.project_team_role(p_project_id uuid) returns text language sql stable security definer set search_path='' as $$
 select case when exists(select 1 from public.projects where id=p_project_id and poster_id=auth.uid()) then 'owner'
 when exists(select 1 from public.project_members where project_id=p_project_id and user_id=auth.uid() and role='admin') then 'admin'
 when exists(select 1 from public.project_coordinators where project_id=p_project_id and user_id=auth.uid()) then 'coordinator' end;
$$;
revoke all on function public.project_team_role(uuid) from public,anon;
grant execute on function public.project_team_role(uuid) to authenticated;

create function project_billing.team_capacity(pid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare owner_id uuid; pass boolean; lim int; used int; pending int;
begin
 select poster_id into owner_id from public.projects where id=pid;
 select exists(select 1 from public.project_purchases where project_id=pid and status='active' and expires_at>now()) into pass;
 lim:=case when project_billing.monthly_limit(owner_id)=2147483647 then 2147483647 when not pass and project_billing.monthly_limit(owner_id)=5 then 10 else 3 end;
 if lim<>2147483647 then select lim+coalesce(sum(quantity),0)::int into lim from public.project_seat_purchases where user_id=owner_id and status='active' and expires_at>now() and case when pass then project_id=pid else project_id is null end; end if;
 with team as (
 select m.user_id from public.project_members m join public.projects p on p.id=m.project_id where p.poster_id=owner_id and m.role in ('admin','collaborator') and case when pass then p.id=pid else project_billing.is_active(p) and not exists(select 1 from public.project_purchases pp where pp.project_id=p.id and pp.status='active' and pp.expires_at>now()) end
 union select c.user_id from public.project_coordinators c join public.projects p on p.id=c.project_id where p.poster_id=owner_id and case when pass then p.id=pid else project_billing.is_active(p) and not exists(select 1 from public.project_purchases pp where pp.project_id=p.id and pp.status='active' and pp.expires_at>now()) end
 union select owner_id
 ), reserved as (
 select distinct i.email from public.project_workspace_invitations i join public.projects p on p.id=i.project_id
 where p.poster_id=owner_id and i.role in ('admin','coordinator') and i.enabled and i.accepted_by is null and i.expires_at>now()
 and case when pass then p.id=pid else project_billing.is_active(p) and not exists(select 1 from public.project_purchases pp where pp.project_id=p.id and pp.status='active' and pp.expires_at>now()) end
 and not exists(select 1 from team t join auth.users u on u.id=t.user_id where lower(u.email)=i.email)
 ) select (select count(*) from team),(select count(*) from reserved) into used,pending;
 return jsonb_build_object('limit',lim,'used',used,'pending',pending,'pass',pass);
end $$;

create table public.project_team_email_deliveries (
 id uuid primary key default gen_random_uuid(), invitation_id uuid not null references public.project_workspace_invitations(id) on delete cascade,
 token text not null, state text not null default 'pending' check(state in ('pending','processing','sent','failed','skipped')),
 attempts int not null default 0, available_at timestamptz not null default now(), first_attempt_at timestamptz,
 lease_id uuid,lease_until timestamptz,last_error text,created_at timestamptz not null default now()
);
create index project_team_email_invitation on public.project_team_email_deliveries(invitation_id);
alter table public.project_team_email_deliveries enable row level security;
revoke all on public.project_team_email_deliveries from public,anon,authenticated;
grant all on public.project_team_email_deliveries to service_role;
create index project_team_email_due on public.project_team_email_deliveries(available_at) where state in ('pending','processing');

create function public.send_project_team_invitation(p_project_id uuid,p_email text,p_role text default 'admin',p_job_title text default '') returns uuid language plpgsql security definer set search_path='' as $$
declare owner_id uuid; inv public.project_workspace_invitations; cap jsonb; address text:=lower(trim(p_email));
begin
 select poster_id into owner_id from public.projects where id=p_project_id;
 if auth.uid() is null or auth.uid() is distinct from owner_id then raise exception 'Only the owner can invite project team members.' using errcode='42501'; end if;
 if p_role not in ('admin','coordinator') or length(p_job_title)>100 or length(address)>320 or address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email, role and job title.'; end if;
 if exists(select 1 from auth.users where id=owner_id and lower(email)=address) then raise exception 'You already own this project.'; end if;
 if exists(select 1 from auth.users u where lower(u.email)=address and (exists(select 1 from public.project_members m where m.project_id=p_project_id and m.user_id=u.id and m.role='admin') or exists(select 1 from public.project_coordinators c where c.project_id=p_project_id and c.user_id=u.id))) then raise exception 'This person is already on the team. Change their access in the team list.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('project-billing:'||owner_id::text,0));
 perform project_billing.require_paid_project(p_project_id);
 if exists(select 1 from public.project_workspace_invitations where project_id=p_project_id and email=address and last_sent_at>now()-interval '60 seconds') then raise exception 'Wait a minute before resending this invitation.'; end if;
 update public.project_workspace_invitations set enabled=false where project_id=p_project_id and email=address;
 insert into public.project_workspace_invitations(project_id,invited_by,role,email,job_title,enabled,last_sent_at)
 values(p_project_id,owner_id,p_role,address,trim(p_job_title),true,now())
 on conflict(project_id,role,email) do update set token='ws_'||replace(gen_random_uuid()::text,'-',''),expires_at=now()+interval '30 days',accepted_by=null,enabled=true,job_title=excluded.job_title,last_sent_at=now()
 returning * into inv;
 cap:=project_billing.team_capacity(p_project_id);
 if (cap->>'used')::int+(cap->>'pending')::int>(cap->>'limit')::int then raise exception 'Your team is full. Add a seat or revoke a pending invitation, then send again.' using errcode='P0001',hint='project_team_capacity_required'; end if;
 insert into public.project_team_email_deliveries(invitation_id,token) values(inv.id,inv.token);
 return inv.id;
end $$;
revoke all on function public.send_project_team_invitation(uuid,text,text,text) from public,anon;
grant execute on function public.send_project_team_invitation(uuid,text,text,text) to authenticated;

-- Existing share links retain participant behavior. Team links require a verified recipient.
alter function public.accept_project_workspace_invitation(text) rename to accept_project_workspace_invitation_before_team;
create function public.accept_project_workspace_invitation(p_token text) returns uuid language plpgsql security definer set search_path='' as $$
declare inv public.project_workspace_invitations; owner_id uuid; cap jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in to join this project.' using errcode='42501'; end if;
 select * into inv from public.project_workspace_invitations where token=lower(trim(p_token));
 if inv.role='participant' then return public.accept_project_workspace_invitation_before_team(p_token); end if;
 select poster_id into owner_id from public.projects where id=inv.project_id;
 perform pg_advisory_xact_lock(hashtextextended('project-billing:'||owner_id::text,0));
 select * into inv from public.project_workspace_invitations where id=inv.id for update;
 if inv.id is null or owner_id is distinct from inv.invited_by then raise exception 'This invitation is unavailable.'; end if;
 if inv.accepted_by=auth.uid() and public.project_team_role(inv.project_id) is not null then return inv.project_id; end if;
 if not inv.enabled or inv.expires_at<=now() then raise exception 'This invitation expired or was revoked. Ask the owner to resend it.'; end if;
 if not exists(select 1 from auth.users where id=auth.uid() and lower(email)=inv.email and email_confirmed_at is not null) then raise exception 'Sign in with the verified email address this invitation was sent to.' using errcode='42501'; end if;
 perform project_billing.require_paid_project(inv.project_id);
 update public.project_workspace_invitations set enabled=false,accepted_by=auth.uid() where id=inv.id;
 if inv.role='admin' then
  delete from public.project_coordinators where project_id=inv.project_id and user_id=auth.uid();
  perform set_config('motiion.admin_invite','on',true);
  insert into public.project_members(project_id,user_id,role,job_title) values(inv.project_id,auth.uid(),'admin',inv.job_title)
  on conflict(project_id,user_id) do update set role='admin',job_title=excluded.job_title;
 else
  delete from public.project_members where project_id=inv.project_id and user_id=auth.uid();
  insert into public.project_coordinators values(inv.project_id,auth.uid(),inv.job_title) on conflict(project_id,user_id) do update set job_title=excluded.job_title;
 end if;
 cap:=project_billing.team_capacity(inv.project_id);
 if (cap->>'used')::int+(cap->>'pending')::int>(cap->>'limit')::int then raise exception 'The owner needs another team seat before you can join.'; end if;
 return inv.project_id;
end $$;
revoke all on function public.accept_project_workspace_invitation(text) from public,anon,authenticated;
revoke all on function public.accept_project_workspace_invitation_before_team(text) from public,anon,authenticated;

-- Admin invitations provide project access, not global industry approval.
create or replace function public.is_project_operator(p_project_id uuid,p_user_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select p_user_id is not null and ((
 (public.has_industry_approval(p_user_id) or public.is_featured_workspace_project(p_project_id) or exists(select 1 from public.projects p where p.id=p_project_id and coalesce(to_jsonb(p)->>'project_type','') not in ('casting','job') and not coalesce((to_jsonb(p)->>'is_composable')::boolean,false)))
 and (exists(select 1 from public.projects p where p.id=p_project_id and p.poster_id=p_user_id) or exists(select 1 from public.project_members m where m.project_id=p_project_id and m.user_id=p_user_id and m.role='admin'))
 ) or exists(
 select 1 from public.project_members m join public.project_workspace_invitations i on i.project_id=m.project_id and i.accepted_by=m.user_id
 where m.project_id=p_project_id and m.user_id=p_user_id and m.role='admin' and i.role='admin'));
$$;
revoke all on function public.is_project_operator(uuid,uuid) from public,anon;
grant execute on function public.is_project_operator(uuid,uuid) to authenticated,service_role;

-- Existing industry approval remains required to create a project. Accepted admins
-- can manage their own project; coordinators can only reach the narrow schedule RPC.
create or replace function public.guard_industry_project_write() returns trigger language plpgsql security definer set search_path='' as $$
declare row_data jsonb;
begin
 if tg_op='UPDATE' then
  if public.is_project_operator(old.id,auth.uid()) then return new; end if;
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

create function public.manage_project_team_member(p_project_id uuid,p_user_id uuid,p_role text,p_job_title text default '') returns void language plpgsql security definer set search_path='' as $$
declare owner_id uuid; cap jsonb;
begin
 select poster_id into owner_id from public.projects where id=p_project_id;
 if auth.uid() is null or auth.uid() is distinct from owner_id or p_user_id=owner_id then raise exception 'Only the owner can change team access.' using errcode='42501'; end if;
 if p_role not in ('admin','coordinator','remove') or length(p_job_title)>100 then raise exception 'Invalid access or job title.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('project-billing:'||owner_id::text,0));
 if not exists(select 1 from public.project_members where project_id=p_project_id and user_id=p_user_id) and not exists(select 1 from public.project_coordinators where project_id=p_project_id and user_id=p_user_id) then raise exception 'Team member not found.'; end if;
 if p_role<>'remove' then perform project_billing.require_paid_project(p_project_id); end if;
 delete from public.project_members where project_id=p_project_id and user_id=p_user_id;
 delete from public.project_coordinators where project_id=p_project_id and user_id=p_user_id;
 if p_role='admin' then
  perform set_config('motiion.admin_invite','on',true);
  insert into public.project_members(project_id,user_id,role,job_title) values(p_project_id,p_user_id,'admin',trim(p_job_title));
 elsif p_role='coordinator' then insert into public.project_coordinators values(p_project_id,p_user_id,trim(p_job_title)); end if;
 cap:=project_billing.team_capacity(p_project_id);
 if p_role<>'remove' and (cap->>'used')::int+(cap->>'pending')::int>(cap->>'limit')::int then raise exception 'Another team seat is required.'; end if;
 -- Prevent old accepted tokens from re-establishing access after removal or downgrade.
 update public.project_workspace_invitations set enabled=false,accepted_by=null where project_id=p_project_id and accepted_by=p_user_id;
 -- Trusted owner grants for existing members also authorize admins without global approval.
 if p_role='admin' then
  insert into public.project_workspace_invitations(project_id,invited_by,role,email,job_title,accepted_by,enabled)
  select p_project_id,owner_id,'admin',lower(email),trim(p_job_title),p_user_id,false from auth.users where id=p_user_id
  on conflict(project_id,role,email) do update set accepted_by=excluded.accepted_by,enabled=false,job_title=excluded.job_title;
 end if;
end $$;
revoke all on function public.manage_project_team_member(uuid,uuid,text,text) from public,anon;
grant execute on function public.manage_project_team_member(uuid,uuid,text,text) to authenticated;

create function public.revoke_project_team_invitation(p_invitation_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.project_workspace_invitations i set enabled=false where i.id=p_invitation_id and exists(select 1 from public.projects p where p.id=i.project_id and p.poster_id=auth.uid());
 if not found then raise exception 'Only the owner can revoke this invitation.' using errcode='42501'; end if;
end $$;
revoke all on function public.revoke_project_team_invitation(uuid) from public,anon;
grant execute on function public.revoke_project_team_invitation(uuid) to authenticated;

create function public.get_project_team_workspace(p_project_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare access text:=public.project_team_role(p_project_id); result jsonb;
begin
 if access is null then raise exception 'You do not have access to this project.' using errcode='42501'; end if;
 select jsonb_build_object('id',p.id,'title',p.title,'role',access,'capacity',case when access='owner' then project_billing.team_capacity(p.id) else null end,
 'members',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'job_title',m.job_title,'name',public._notif_profile_display_name(m.user_id))) from (
 select p.poster_id as user_id,'owner' as role,'' as job_title union all
 select user_id,role,job_title from public.project_members where project_id=p.id and user_id<>p.poster_id and role='admin' union all
 select user_id,'coordinator',job_title from public.project_coordinators where project_id=p.id) m),'[]'::jsonb),
 'invitations',case when access='owner' then coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'email',i.email,'role',i.role,'job_title',i.job_title,'enabled',i.enabled,'accepted',i.accepted_by is not null,'expires_at',i.expires_at,'delivery',coalesce((select d.state from public.project_team_email_deliveries d where d.invitation_id=i.id order by d.created_at desc limit 1),'not_sent'))) from public.project_workspace_invitations i where i.project_id=p.id and i.role in ('admin','coordinator')),'[]'::jsonb) else '[]'::jsonb end,
 'schedule',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'title',a.title,'date',a.activity_date,'start_time',a.start_time,'end_time',a.end_time,'location',a.location) order by a.activity_date,a.start_time) from public.activities a where a.project_id=p.id and a.status<>'cancelled'),'[]'::jsonb) || coalesce((select jsonb_agg(jsonb_build_object('id',md5((cat->>'id_key')||day)::uuid,'category_id',cat->>'id_key','original_day',day,'title',coalesce(nullif(cat->>'custom_schedule_title',''),cat->>'activity_type_raw','Project date'),'date',day,'start_time',cat->'start_time_by_day'->>day,'end_time',cat->'end_time_by_day'->>day,'location',cat->'location_by_day'->>day)) from jsonb_array_elements(coalesce(p.project_details->'schedule_categories',p.casting_configuration->'schedule_categories','[]')) cat cross join lateral jsonb_array_elements_text(coalesce(cat->'selected_days_yyyymmdd','[]')) day),'[]'::jsonb)) into result from public.projects p where p.id=p_project_id;
 return result;
end $$;
revoke all on function public.get_project_team_workspace(uuid) from public,anon;
grant execute on function public.get_project_team_workspace(uuid) to authenticated;

create function public.update_project_team_schedule(p_project_id uuid,p_activity_id uuid,p_date date,p_start time,p_end time,p_location text) returns void language plpgsql security definer set search_path='' as $$
begin
 if public.project_team_role(p_project_id) is null then raise exception 'Project team access required.' using errcode='42501'; end if;
 if length(p_location)>500 or (p_start is not null and p_end is not null and p_end<=p_start) then raise exception 'Check the location and start/end times.'; end if;
 perform project_billing.require_paid_project(p_project_id);
 update public.activities set activity_date=p_date,start_time=p_start,end_time=p_end,location=nullif(trim(p_location),'') where id=p_activity_id and project_id=p_project_id and status<>'cancelled';
 if not found then raise exception 'Scheduled activity not found.'; end if;
end $$;
revoke all on function public.update_project_team_schedule(uuid,uuid,date,time,time,text) from public,anon;
grant execute on function public.update_project_team_schedule(uuid,uuid,date,time,time,text) to authenticated;

create function public.update_project_team_occurrence(p_project_id uuid,p_category_id uuid,p_day text,p_date date,p_start time,p_end time,p_location text) returns void language plpgsql security definer set search_path='' as $$
declare p public.projects; cats jsonb; item jsonb; updated jsonb:='[]'; newday text:=p_date::text; key text; found_item boolean:=false;
begin
 if public.project_team_role(p_project_id) is null then raise exception 'Project team access required.' using errcode='42501'; end if;
 if p_date is null or length(p_location)>500 then raise exception 'Check the date and location.'; end if;
 perform project_billing.require_paid_project(p_project_id);
 select * into p from public.projects where id=p_project_id for update;
 cats:=coalesce(p.project_details->'schedule_categories',p.casting_configuration->'schedule_categories','[]'::jsonb);
 for item in select value from jsonb_array_elements(cats) loop
  if lower(item->>'id_key')=p_category_id::text and (item->'selected_days_yyyymmdd') ? p_day then
   found_item:=true;
   if p_day<>newday and (item->'selected_days_yyyymmdd') ? newday then raise exception 'This schedule item already has that date.'; end if;
   item:=jsonb_set(item,'{selected_days_yyyymmdd}',(select jsonb_agg(case when value=p_day then newday else value end) from jsonb_array_elements_text(item->'selected_days_yyyymmdd')));
   foreach key in array array['start_time_by_day','end_time_by_day','location_by_day','applies_to_group_ids_by_day'] loop
    if p_day<>newday and (item->key) ? p_day then item:=jsonb_set(item,array[key],((item->key)-p_day)||jsonb_build_object(newday,item->key->p_day)); end if;
   end loop;
   item:=jsonb_set(item,'{start_time_by_day}',(coalesce(item->'start_time_by_day','{}')-newday)||case when p_start is null then '{}'::jsonb else jsonb_build_object(newday,to_char(p_start,'HH24:MI:SS')) end);
   item:=jsonb_set(item,'{end_time_by_day}',(coalesce(item->'end_time_by_day','{}')-newday)||case when p_end is null then '{}'::jsonb else jsonb_build_object(newday,to_char(p_end,'HH24:MI:SS')) end);
   item:=jsonb_set(item,'{location_by_day}',(coalesce(item->'location_by_day','{}')-newday)||case when nullif(trim(p_location),'') is null then '{}'::jsonb else jsonb_build_object(newday,trim(p_location)) end);
  end if;
  updated:=updated||jsonb_build_array(item);
 end loop;
 if not found_item then raise exception 'Schedule changed. Refresh and try again.'; end if;
 update public.projects set project_details=jsonb_set(coalesce(project_details,'{}'),'{schedule_categories}',updated),casting_configuration=jsonb_set(coalesce(casting_configuration,'{}'),'{schedule_categories}',updated) where id=p_project_id;
end $$;
revoke all on function public.update_project_team_occurrence(uuid,uuid,text,date,time,time,text) from public,anon;
grant execute on function public.update_project_team_occurrence(uuid,uuid,text,date,time,time,text) to authenticated;

create function public.list_invited_team_projects() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'role',public.project_team_role(p.id)) order by p.updated_at desc),'[]'::jsonb) from public.projects p
 where exists(select 1 from public.project_members m where m.project_id=p.id and m.user_id=auth.uid() and m.role='admin') or exists(select 1 from public.project_coordinators c where c.project_id=p.id and c.user_id=auth.uid());
$$;
revoke all on function public.list_invited_team_projects() from public,anon;
grant execute on function public.list_invited_team_projects() to authenticated;

-- Service-only queue RPCs. Claims expire and retries reuse one provider idempotency key.
create function public.claim_project_team_emails() returns setof public.project_team_email_deliveries language plpgsql security definer set search_path='' as $$
begin
 update public.project_team_email_deliveries set state='failed',last_error='Retry window expired; reconcile provider status.' where state in ('pending','processing') and first_attempt_at<now()-interval '23 hours';
 return query with due as (select id from public.project_team_email_deliveries where (state='pending' and available_at<=now()) or (state='processing' and lease_until<now()) order by created_at for update skip locked limit 5)
 update public.project_team_email_deliveries d set state='processing',lease_id=gen_random_uuid(),lease_until=now()+interval '5 minutes',attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()) from due where d.id=due.id returning d.*;
end $$;
create function public.finish_project_team_email(p_id uuid,p_lease uuid,p_result text,p_error text default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_result not in ('sent','retry','skipped','failed') then raise exception 'Invalid result'; end if;
 update public.project_team_email_deliveries set state=case when p_result='retry' then 'pending' else p_result end,available_at=now()+interval '2 minutes',lease_until=null,last_error=left(p_error,500) where id=p_id and lease_id=p_lease and state='processing';
end $$;
revoke all on function public.claim_project_team_emails() from public,anon,authenticated;
revoke all on function public.finish_project_team_email(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.claim_project_team_emails() to service_role;
grant execute on function public.finish_project_team_email(uuid,uuid,text,text) to service_role;
revoke all on all functions in schema project_billing from public,anon,authenticated;

create or replace function project_billing.guard_seats() returns trigger language plpgsql security definer set search_path='' as $$
declare owner_id uuid; cap jsonb; address text; already_counted boolean; reserved boolean;
begin
 if new.role not in ('admin','collaborator') then return new; end if;
 select poster_id into owner_id from public.projects where id=new.project_id;
 if owner_id is null or new.user_id=owner_id then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended('project-billing:'||owner_id::text,0));
 perform project_billing.require_paid_project(new.project_id);
 cap:=project_billing.team_capacity(new.project_id);
 select lower(email) into address from auth.users where id=new.user_id;
 select exists(select 1 from public.project_members m join public.projects p on p.id=m.project_id where p.poster_id=owner_id and m.user_id=new.user_id and m.role in ('admin','collaborator') and case when (cap->>'pass')::boolean then p.id=new.project_id else project_billing.is_active(p) and not exists(select 1 from public.project_purchases pp where pp.project_id=p.id and pp.status='active' and pp.expires_at>now()) end) into already_counted;
 if not already_counted then
 select exists(select 1 from public.project_coordinators c join public.projects p on p.id=c.project_id where p.poster_id=owner_id and c.user_id=new.user_id and case when (cap->>'pass')::boolean then p.id=new.project_id else project_billing.is_active(p) and not exists(select 1 from public.project_purchases pp where pp.project_id=p.id and pp.status='active' and pp.expires_at>now()) end) into already_counted;
 end if;
 if already_counted then return new; end if;
 select exists(select 1 from public.project_workspace_invitations i join public.projects p on p.id=i.project_id where p.poster_id=owner_id and i.email=address and i.enabled and i.accepted_by is null and i.expires_at>now() and i.role in ('admin','coordinator') and case when (cap->>'pass')::boolean then p.id=new.project_id else project_billing.is_active(p) and not exists(select 1 from public.project_purchases pp where pp.project_id=p.id and pp.status='active' and pp.expires_at>now()) end) into reserved;
 if (cap->>'used')::int+(cap->>'pending')::int-(case when reserved then 1 else 0 end) >=(cap->>'limit')::int then raise exception 'Your team is full. Add another seat to invite this person.' using errcode='P0001',hint='project_team_capacity_required'; end if;
 return new;
end $$;
revoke all on function project_billing.guard_seats() from public,anon,authenticated;

create function public.dispatch_project_team_emails() returns void language plpgsql security definer set search_path='' as $$
declare target text; secret text;
begin
 select replace(worker_url,'industry-approval-dispatch','project-team-dispatch') into target from public.industry_approval_delivery_config where singleton and email_enabled;
 if target is null then return; end if;
 select decrypted_secret into secret from vault.decrypted_secrets where name='industry_approval_dispatch_secret' limit 1;
 if nullif(secret,'') is null then return; end if;
 perform net.http_post(url=>target,headers=>jsonb_build_object('Content-Type','application/json','x-notif-dispatch-secret',secret),body=>'{}'::jsonb,timeout_milliseconds=>180000);
end $$;
revoke all on function public.dispatch_project_team_emails() from public,anon,authenticated;
select cron.schedule('project-team-email-delivery','* * * * *','select public.dispatch_project_team_emails()');
