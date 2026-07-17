-- Allow a client shortlist share to include talent across one or more roles.
alter table public.casting_shortlist_shares
  add column if not exists role_ids uuid[] not null default '{}'::uuid[];

update public.casting_shortlist_shares
set role_ids = array[role_id]
where coalesce(array_length(role_ids, 1), 0) = 0
  and role_id is not null;

create index if not exists idx_casting_shortlist_shares_role_ids
  on public.casting_shortlist_shares using gin (role_ids);
