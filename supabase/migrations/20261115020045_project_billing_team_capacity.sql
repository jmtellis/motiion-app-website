create function project_billing.guard_seats() returns trigger language plpgsql security definer set search_path='' as $$
declare owner uuid; lim int; used int; pass_project boolean;
begin
 if new.role not in ('admin','collaborator') then return new; end if;
 select poster_id into owner from public.projects where id=new.project_id;
 if owner is null or new.user_id=owner then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended('project-billing:'||owner::text,0));
 if project_billing.monthly_limit(owner)=2147483647 then return new; end if;
 select exists(select 1 from public.project_purchases where project_id=new.project_id and status='active' and expires_at>now()) into pass_project;
 lim:=case when not pass_project and project_billing.monthly_limit(owner)=5 then 10 else 3 end;
 select count(distinct m.user_id)+1 into used from public.project_members m join public.projects p on p.id=m.project_id
 where p.poster_id=owner and m.role in ('admin','collaborator') and m.user_id<>owner and m.user_id<>new.user_id
 and case when pass_project then p.id=new.project_id else project_billing.is_active(p) end;
 if used>=lim then raise exception 'Your plan has reached its team member limit.' using errcode='P0001',hint='project_team_capacity_required'; end if;
 return new;
end $$;
create trigger a_project_team_capacity before insert or update on public.project_members for each row execute function project_billing.guard_seats();
revoke all on function project_billing.guard_seats() from public,anon,authenticated;

-- A risk hold is sticky until explicitly reviewed; renewals must not silently lift it.
create or replace function public.sync_project_purchase(p_user_id uuid,p_provider text,p_external_id text,p_plan text,p_status text,p_expires_at timestamptz,p_event_at timestamptz)
returns void language plpgsql security definer set search_path='' as $$
declare prior public.project_purchases;
begin
 if p_user_id is null or p_external_id is null or p_event_at is null then raise exception 'Invalid receipt'; end if;
 perform pg_advisory_xact_lock(hashtextextended('project-billing:'||p_user_id::text,0));
 select * into prior from public.project_purchases where provider=p_provider and external_id=p_external_id for update;
 if found then
  if prior.user_id<>p_user_id then raise exception 'Receipt belongs to another account'; end if;
  if prior.event_at>p_event_at or prior.status='revoked' then return; end if;
 end if;
 insert into public.project_purchases(user_id,provider,external_id,plan,status,expires_at,event_at)
 values(p_user_id,p_provider,p_external_id,p_plan,p_status,p_expires_at,p_event_at)
 on conflict(provider,external_id) do update set plan=excluded.plan,status=excluded.status,
 expires_at=case when excluded.plan='project_pass' then project_purchases.expires_at else excluded.expires_at end,event_at=excluded.event_at;
end $$;
