-- New review outcomes use the existing retry/lease/idempotency pipeline.
-- Deploy the backwards-compatible dispatcher first. Do not backfill old requests.
alter table public.industry_approval_deliveries
  add column event_kind text not null default 'approved'
  check (event_kind in ('approved','needs_information'));
alter table public.industry_approval_deliveries
  drop constraint industry_approval_deliveries_user_id_application_version_ch_key;
alter table public.industry_approval_deliveries
  add constraint industry_review_delivery_event_unique
  unique(user_id,application_version,event_kind,channel,destination);
create or replace function public.enqueue_industry_approval_delivery() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status in ('approved','needs_information') and old.status is distinct from new.status then
   insert into public.industry_approval_deliveries(user_id,application_version,event_kind,channel,destination)
   select new.user_id,new.version,new.status,'email',u.email from auth.users u
   where u.id=new.user_id and nullif(u.email,'') is not null
   on conflict do nothing;
   if new.status='approved' then
     insert into public.industry_approval_deliveries(user_id,application_version,event_kind,channel,destination)
     select new.user_id,new.version,'approved','push',d.apns_token from public.device_tokens d
     join public.profiles p on p.user_id=d.user_id
     where d.user_id=new.user_id and coalesce(p.notifications_enabled,true)
     on conflict do nothing;
   end if;
 end if;
 return new;
end;
$$;
revoke all on function public.enqueue_industry_approval_delivery() from public,anon,authenticated;
