-- Motiion-managed promo codes for paid activities (events/classes).
-- Codes are validated in Motiion before Checkout session create so Connect
-- application_fee_amount stays correct; Stripe Coupon/Promotion Code ids are stored for audit.

create table if not exists public.activity_promo_codes (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  code text not null,
  discount_type text not null check (discount_type in ('percent', 'fixed_cents')),
  discount_value int not null check (discount_value > 0),
  max_redemptions int,
  redeemed_count int not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  sort_order int not null default 0,
  stripe_coupon_id text,
  stripe_promotion_code_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_id, code)
);

create index if not exists idx_activity_promo_codes_activity
  on public.activity_promo_codes (activity_id, is_active, sort_order);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'activity_promo_codes_percent_range'
  ) then
    alter table public.activity_promo_codes
      add constraint activity_promo_codes_percent_range
      check (
        (discount_type = 'percent' and discount_value between 1 and 100)
        or (discount_type = 'fixed_cents' and discount_value >= 1)
      );
  end if;
end $$;

comment on table public.activity_promo_codes is
  'Organizer promo codes for ticket checkout; applied server-side before Stripe session create.';

alter table public.activity_promo_codes enable row level security;

drop policy if exists "Managers can manage activity promo codes" on public.activity_promo_codes;
create policy "Managers can manage activity promo codes"
  on public.activity_promo_codes
  for all
  to authenticated
  using (public.is_activity_manager(activity_id))
  with check (public.is_activity_manager(activity_id));

-- Buyers do not list codes via RLS; edge functions use service role to validate.

create table if not exists public.activity_promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.activity_promo_codes(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  enrollment_id uuid references public.enrollments(id) on delete set null,
  stripe_checkout_session_id text,
  student_id uuid,
  discount_cents int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_promo_redemptions_promo
  on public.activity_promo_redemptions (promo_code_id, created_at desc);

create index if not exists idx_activity_promo_redemptions_activity
  on public.activity_promo_redemptions (activity_id);

alter table public.activity_promo_redemptions enable row level security;

drop policy if exists "Managers can read promo redemptions" on public.activity_promo_redemptions;
create policy "Managers can read promo redemptions"
  on public.activity_promo_redemptions
  for select
  to authenticated
  using (public.is_activity_manager(activity_id));

-- Optional column on checkout audit table when present.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'stripe_checkout_sessions'
  ) then
    alter table public.stripe_checkout_sessions
      add column if not exists promo_code_id uuid references public.activity_promo_codes(id) on delete set null;
    alter table public.stripe_checkout_sessions
      add column if not exists promo_discount_cents int;
  end if;
end $$;
