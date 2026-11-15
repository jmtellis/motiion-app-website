-- Deploy the backwards-compatible industry-approval-dispatch worker before this migration.
-- Receipt queueing is atomic with submission on web and iOS; no historical backfill.
alter table public.industry_approval_deliveries
  drop constraint industry_approval_deliveries_event_kind_check;
alter table public.industry_approval_deliveries
  add constraint industry_approval_deliveries_event_kind_check
  check (event_kind in ('approved','needs_information','submitted'));

create function public.enqueue_industry_submission_receipt() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.status <> 'pending' then return new; end if;
  if tg_op = 'UPDATE' then
    if old.status = 'pending' and old.version = new.version then return new; end if;
  end if;
  insert into public.industry_approval_deliveries(user_id,application_version,event_kind,channel,destination)
  select new.user_id,new.version,'submitted','email',u.email from auth.users u
  where u.id=new.user_id and nullif(u.email,'') is not null
  on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.enqueue_industry_submission_receipt() from public,anon,authenticated;
create trigger industry_submission_receipt
  after insert or update of status,version on public.industry_applications
  for each row execute function public.enqueue_industry_submission_receipt();
