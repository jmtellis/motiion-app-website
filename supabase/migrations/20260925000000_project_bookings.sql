-- Internal booking coordination; no payment or signature status is implied.
create table public.project_bookings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  talent_name text not null check (length(talent_name) between 1 and 200),
  role text not null default '',
  status text not null default 'draft' check (status in ('draft','negotiating','confirmed','completed','cancelled')),
  fee_cents bigint not null default 0 check (fee_cents >= 0 and fee_cents <= 1000000000),
  currency text not null default 'USD' check (currency in ('USD','CAD','GBP','EUR','AUD')),
  start_date date,
  end_date date,
  payer_name text not null default '',
  payer_email text not null default '',
  terms text not null default '',
  negotiation_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index project_bookings_project_idx on public.project_bookings(project_id, created_at);
alter table public.project_bookings enable row level security;
create policy project_bookings_owner on public.project_bookings for all to authenticated
using (exists (select 1 from public.projects p where p.id = project_id and p.poster_id = (select auth.uid())))
with check (exists (select 1 from public.projects p where p.id = project_id and p.poster_id = (select auth.uid())));
grant select, insert, update, delete on public.project_bookings to authenticated;
