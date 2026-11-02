-- Approval delivery is a durable server-side consequence of a staff decision.
alter table public.industry_applications add column if not exists intro_completed_at timestamptz;
create table public.industry_approval_delivery_config (
  singleton boolean primary key default true check (singleton),
  email_enabled boolean not null default false,
  push_enabled boolean not null default false
);
insert into public.industry_approval_delivery_config default values;
alter table public.industry_approval_delivery_config enable row level security;
revoke all on public.industry_approval_delivery_config from public, anon, authenticated;
grant all on public.industry_approval_delivery_config to service_role;
create function public.industry_approval_notification_channels() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('email',email_enabled,'push',push_enabled) from public.industry_approval_delivery_config where singleton;
$$;
revoke all on function public.industry_approval_notification_channels() from public,anon;
grant execute on function public.industry_approval_notification_channels() to authenticated;

create table public.industry_approval_deliveries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.industry_applications(user_id) on delete cascade,
 application_version integer not null,
 channel text not null check(channel in ('email','push')),
 destination text not null,
 state text not null default 'pending' check(state in ('pending','processing','sent','skipped','failed')),
 attempts integer not null default 0,
 available_at timestamptz not null default now(),
 first_attempt_at timestamptz,
 lease_id uuid,
 lease_until timestamptz,
 delivered_at timestamptz,
 last_error text,
 created_at timestamptz not null default now(),
 unique(user_id,application_version,channel,destination)
);
alter table public.industry_approval_deliveries enable row level security;
revoke all on public.industry_approval_deliveries from public,anon,authenticated;
grant all on public.industry_approval_deliveries to service_role;
create index industry_approval_delivery_due on public.industry_approval_deliveries(available_at) where state in ('pending','processing');

create function public.enqueue_industry_approval_delivery() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='approved' and old.status is distinct from 'approved' then
   -- Deliver to the authenticated account email, never a caller-supplied arbitrary recipient.
   insert into public.industry_approval_deliveries(user_id,application_version,channel,destination)
   select new.user_id,new.version,'email',u.email from auth.users u where u.id=new.user_id and nullif(u.email,'') is not null
   on conflict do nothing;
   insert into public.industry_approval_deliveries(user_id,application_version,channel,destination)
   select new.user_id,new.version,'push',d.apns_token from public.device_tokens d
   join public.profiles p on p.user_id=d.user_id
   where d.user_id=new.user_id and coalesce(p.notifications_enabled,true)
   on conflict do nothing;
 end if;
 return new;
end;
$$;
revoke all on function public.enqueue_industry_approval_delivery() from public,anon,authenticated;
create trigger industry_approval_delivery after update of status on public.industry_applications
for each row execute function public.enqueue_industry_approval_delivery();

create function public.claim_industry_approval_deliveries(p_limit integer default 20)
returns setof public.industry_approval_deliveries language plpgsql security definer set search_path='' as $$
begin
 -- Resend idempotency expires after 24 hours. Never blindly replay ambiguous older sends.
 update public.industry_approval_deliveries set state='failed',last_error='Retry window expired; reconcile provider status before retrying.'
 where state in ('pending','processing') and first_attempt_at < now()-interval '23 hours';
 return query with due as (
   select d.id from public.industry_approval_deliveries d
   cross join public.industry_approval_delivery_config c
   where ((d.state='pending' and d.available_at<=now()) or (d.state='processing' and d.lease_until<now()))
   and ((d.channel='email' and c.email_enabled) or (d.channel='push' and c.push_enabled))
   order by d.created_at for update of d skip locked limit greatest(1,least(p_limit,50))
 ) update public.industry_approval_deliveries d set state='processing',lease_id=gen_random_uuid(),lease_until=now()+interval '5 minutes',
 attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()) from due where d.id=due.id returning d.*;
end;
$$;
revoke all on function public.claim_industry_approval_deliveries(integer) from public,anon,authenticated;
grant execute on function public.claim_industry_approval_deliveries(integer) to service_role;

create function public.finish_industry_approval_delivery(p_id uuid,p_lease uuid,p_result text,p_error text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_result not in ('sent','skipped','retry','failed') then raise exception 'Invalid result'; end if;
 update public.industry_approval_deliveries set
 state=case when p_result='retry' then 'pending' else p_result end,
 available_at=now()+make_interval(secs=>least(3600,30*power(2,least(attempts,7))::integer)),
 delivered_at=case when p_result='sent' then now() else delivered_at end,
 lease_until=null,last_error=left(p_error,500)
 where id=p_id and lease_id=p_lease and state='processing';
end;
$$;
revoke all on function public.finish_industry_approval_delivery(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.finish_industry_approval_delivery(uuid,uuid,text,text) to service_role;

create function public.complete_industry_approval_intro() returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 update public.industry_applications set intro_completed_at=coalesce(intro_completed_at,now()) where user_id=auth.uid() and status='approved';
 if not found then raise exception 'Approval required' using errcode='42501'; end if;
end;
$$;
revoke all on function public.complete_industry_approval_intro() from public,anon;
grant execute on function public.complete_industry_approval_intro() to authenticated;

-- No backfill sends: users approved before this feature get the intro, not surprise email/push.
-- A scheduler invokes the worker with the existing NOTIF_DISPATCH_SECRET convention.
-- Channels remain disabled until provider credentials and the destination site are configured.
