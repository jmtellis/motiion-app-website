-- MOT-94 booking deal memos (payments, contracts, finalization).
--
-- Entry: an Industry availability request the Talent answered available. Industry composes a
-- templated `tour_live_dancer` deal memo, both sides negotiate with structured flags, Talent
-- accepts, and Industry pays one card charge through Stripe Connect:
--   charge = talent_deal_cents + platform_fee_cents (Motiion 10% on top)
--   application_fee_amount = platform_fee_cents; destination transfer = full talent_deal_cents.
--
-- Writes go through Edge Functions (service role) and `booking_deal_memo_write`. Authenticated
-- clients only SELECT their own side. `project_bookings` stays internal coordination and is not
-- the source of truth for these deals.
--
-- Booking payout recipients (Accounts v2 Recipient + Express dashboard) live in
-- `booking_payout_accounts`, separate from class instructor Connect (`profiles.stripe_connect_account_id`,
-- Accounts v1 Express + card_payments) and from Stripe Identity (`profiles.identity_verification_*`).

-- ---------------------------------------------------------------------------
-- Booking payout recipients
-- ---------------------------------------------------------------------------

create table if not exists public.booking_payout_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_account_id text not null unique
    check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  accounts_api text not null default 'v2' check (accounts_api = 'v2'),
  dashboard text not null default 'express' check (dashboard = 'express'),
  stripe_transfers_status text not null default 'pending'
    check (stripe_transfers_status in ('pending', 'active', 'restricted', 'unsupported')),
  payouts_status text
    check (payouts_status is null or payouts_status in ('pending', 'active', 'restricted', 'unsupported')),
  requirements_currently_due int not null default 0 check (requirements_currently_due >= 0),
  requirements_past_due int not null default 0 check (requirements_past_due >= 0),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_booking_payout_accounts_transfers_status
  on public.booking_payout_accounts (stripe_transfers_status);

comment on table public.booking_payout_accounts is
  'MOT-94 Talent booking payout recipient (Stripe Accounts v2, recipient configuration, Express dashboard). Separate from class Connect on profiles.stripe_connect_account_id. Service role writes only.';
comment on column public.booking_payout_accounts.stripe_transfers_status is
  'configuration.recipient.capabilities.stripe_balance.stripe_transfers.status. Pay is blocked until active.';

-- ---------------------------------------------------------------------------
-- Deal memos
-- ---------------------------------------------------------------------------

create table if not exists public.booking_deal_memos (
  id uuid primary key default gen_random_uuid(),
  availability_check_request_id uuid not null
    references public.availability_check_requests(id),
  project_id uuid references public.projects(id) on delete set null,
  industry_user_id uuid not null references auth.users(id) on delete cascade,
  talent_user_id uuid not null references auth.users(id) on delete cascade,

  template_key text not null default 'tour_live_dancer'
    check (template_key in ('tour_live_dancer')),
  template_version int not null default 1 check (template_version >= 1),
  soft_kind_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(soft_kind_snapshot) = 'object'),

  status text not null default 'draft'
    check (status in (
      'draft', 'offered', 'negotiating', 'accepted', 'payment_pending',
      'paid', 'declined', 'cancelled', 'expired'
    )),
  awaiting_party text check (awaiting_party is null or awaiting_party in ('talent', 'industry')),
  negotiation_round int not null default 0 check (negotiation_round >= 0),
  version int not null default 1 check (version >= 1),
  cover_note text check (cover_note is null or char_length(cover_note) <= 280),

  currency text not null default 'usd' check (currency = 'usd'),
  talent_deal_cents bigint not null default 0 check (talent_deal_cents >= 0),
  platform_fee_bps int not null default 1000 check (platform_fee_bps between 0 and 10000),
  platform_fee_cents bigint not null default 0 check (platform_fee_cents >= 0),
  charge_amount_cents bigint not null default 0
    check (charge_amount_cents >= 0 and charge_amount_cents <= 99999999),
  agency_clause_enabled boolean not null default false,

  exhibit_a_version text not null default 'motiion-exhibit-a-placeholder-v0'
    check (char_length(exhibit_a_version) between 1 and 80),
  eor_version text not null default 'motiion-eor-placeholder-v0'
    check (char_length(eor_version) between 1 and 80),

  talent_signed_name text check (talent_signed_name is null or char_length(talent_signed_name) between 2 and 120),
  talent_signed_at timestamptz,
  industry_signed_name text check (industry_signed_name is null or char_length(industry_signed_name) between 2 and 120),
  industry_signed_at timestamptz,

  stripe_destination_account_id text
    check (stripe_destination_account_id is null or stripe_destination_account_id ~ '^acct_[A-Za-z0-9]+$'),
  stripe_payment_intent_id text unique,
  stripe_checkout_session_id text unique,
  stripe_charge_id text,
  payment_state text not null default 'none'
    check (payment_state in (
      'none', 'requires_payment', 'processing', 'succeeded', 'failed',
      'refunded', 'partially_refunded', 'disputed'
    )),
  amount_refunded_cents bigint not null default 0 check (amount_refunded_cents >= 0),
  paid_at timestamptz,

  declined_by text check (declined_by is null or declined_by in ('talent', 'industry')),
  decline_reason text
    check (decline_reason is null or decline_reason in ('budget', 'not_available', 'policy', 'other')),
  decline_note text check (decline_note is null or char_length(decline_note) <= 280),

  offered_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz,
  declined_at timestamptz,
  cancelled_at timestamptz,
  idempotency_key text
    check (idempotency_key is null or char_length(idempotency_key) between 8 and 128),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint booking_deal_memos_parties_distinct
    check (industry_user_id <> talent_user_id),
  constraint booking_deal_memos_fee_on_top
    check (
      platform_fee_cents = round(talent_deal_cents::numeric * platform_fee_bps / 10000)
      and charge_amount_cents = talent_deal_cents + platform_fee_cents
    ),
  constraint booking_deal_memos_awaiting_party_state
    check ((status in ('offered', 'negotiating')) = (awaiting_party is not null)),
  constraint booking_deal_memos_ready_snapshot
    check (
      status not in ('payment_pending', 'paid')
      or (talent_deal_cents >= 100 and accepted_at is not null and talent_signed_at is not null)
    ),
  constraint booking_deal_memos_paid_requires_payment
    check (status <> 'paid' or (paid_at is not null and stripe_payment_intent_id is not null and industry_signed_at is not null)),
  constraint booking_deal_memos_refund_within_charge
    check (amount_refunded_cents <= charge_amount_cents)
);

create unique index if not exists booking_deal_memos_active_availability_uidx
  on public.booking_deal_memos (availability_check_request_id)
  where status not in ('declined', 'cancelled', 'expired');

create unique index if not exists booking_deal_memos_idempotency_uidx
  on public.booking_deal_memos (industry_user_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_booking_deal_memos_industry
  on public.booking_deal_memos (industry_user_id, updated_at desc);

create index if not exists idx_booking_deal_memos_talent
  on public.booking_deal_memos (talent_user_id, updated_at desc)
  where status <> 'draft';

create index if not exists idx_booking_deal_memos_project
  on public.booking_deal_memos (project_id)
  where project_id is not null;

create index if not exists idx_booking_deal_memos_ready_expiry
  on public.booking_deal_memos (expires_at)
  where status = 'payment_pending';

comment on table public.booking_deal_memos is
  'MOT-94 templated deal memo between an Industry requester and a Talent after availability is confirmed. Service role writes only (Edge Functions).';
comment on column public.booking_deal_memos.status is
  'draft → offered → negotiating → payment_pending (Ready for payment) → paid (Booked). Terminal: declined, cancelled, expired. accepted is reserved; mutual accept moves straight to payment_pending.';
comment on column public.booking_deal_memos.awaiting_party is
  'Whose turn it is while offered/negotiating. negotiating+industry = Changes requested.';
comment on column public.booking_deal_memos.version is
  'Optimistic concurrency counter; incremented on every update.';
comment on column public.booking_deal_memos.talent_deal_cents is
  'Negotiated guaranteed deal. Talent receives this in full (destination transfer).';
comment on column public.booking_deal_memos.platform_fee_cents is
  'Motiion platform fee on top: round(talent_deal_cents * platform_fee_bps / 10000). Stripe application_fee_amount.';
comment on column public.booking_deal_memos.charge_amount_cents is
  'Industry card charge (PaymentIntent amount) = talent_deal_cents + platform_fee_cents.';
comment on column public.booking_deal_memos.agency_clause_enabled is
  'Optional agency commission clause (off by default). Deal economics only; never part of the Motiion fee.';
comment on column public.booking_deal_memos.exhibit_a_version is
  'Motiion General Terms version. Placeholder until counsel text lands (legal review is a ship gate).';
comment on column public.booking_deal_memos.expires_at is
  'Unpaid Ready for payment expires 7 days after mutual accept.';

-- ---------------------------------------------------------------------------
-- Provisions (one row per template module)
-- ---------------------------------------------------------------------------

create table if not exists public.booking_deal_memo_provisions (
  id uuid primary key default gen_random_uuid(),
  memo_id uuid not null references public.booking_deal_memos(id) on delete cascade,
  module_code text not null check (module_code in (
    'services_role', 'billing_credit', 'dance_captain', 'specialty_talent',
    'work_dates',
    'rates', 'pro_rating', 'per_diem', 'payment_terms', 'agency_commission',
    'usage_buyout', 'merchandising', 'additional_performances', 'mfn',
    'hotel', 'travel', 'baggage', 'holding_day_room', 'meals',
    'insurance', 'visa_passport', 'cancellation', 'wardrobe_hmu', 'physical_floors',
    'hazardous_work', 'talent_release',
    'governing_law', 'warranty_hiring_entity', 'motiion_terms'
  )),
  section text not null check (section in (
    'role_credit', 'dates', 'money', 'usage_extras', 'travel_stay', 'protection', 'legal'
  )),
  sort_order int not null default 0,
  included boolean not null default true,
  value jsonb not null default '{}'::jsonb check (jsonb_typeof(value) = 'object'),
  previous_included boolean,
  previous_value jsonb check (previous_value is null or jsonb_typeof(previous_value) = 'object'),
  state text not null default 'pending' check (state in ('pending', 'accepted', 'change_requested')),
  talent_flag text check (talent_flag is null or talent_flag in ('accept', 'remove', 'add', 'dispute')),
  talent_proposed_value jsonb
    check (talent_proposed_value is null or jsonb_typeof(talent_proposed_value) = 'object'),
  talent_note text check (talent_note is null or char_length(talent_note) <= 280),
  industry_reply text check (industry_reply is null or industry_reply in ('accept_change', 'decline', 'counter')),
  industry_decline_reason text
    check (industry_decline_reason is null or industry_decline_reason in ('budget', 'not_available', 'policy', 'other')),
  industry_note text check (industry_note is null or char_length(industry_note) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (memo_id, module_code),
  constraint booking_deal_memo_provisions_flag_state
    check (state <> 'change_requested' or coalesce(talent_flag in ('remove', 'add', 'dispute'), false))
);

create index if not exists idx_booking_deal_memo_provisions_memo
  on public.booking_deal_memo_provisions (memo_id, sort_order);

create index if not exists idx_booking_deal_memo_provisions_open_flags
  on public.booking_deal_memo_provisions (memo_id)
  where state = 'change_requested';

comment on table public.booking_deal_memo_provisions is
  'MOT-94 structured deal memo modules (tour_live_dancer template). Values are typed per module in supabase/functions/_shared/booking-deal-memo-template.ts. No free-form contract text.';
comment on column public.booking_deal_memo_provisions.previous_value is
  'Value before the latest Industry reply, for the before → after diff.';
comment on column public.booking_deal_memo_provisions.talent_proposed_value is
  'Talent dispute / add request value, validated against the module schema.';

-- ---------------------------------------------------------------------------
-- Events (append-only audit)
-- ---------------------------------------------------------------------------

create table if not exists public.booking_deal_memo_events (
  id uuid primary key default gen_random_uuid(),
  memo_id uuid not null references public.booking_deal_memos(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text not null check (actor_role in ('industry', 'talent', 'system', 'stripe')),
  action text not null check (action in (
    'draft_saved', 'sent', 'talent_flagged', 'industry_replied', 'talent_accepted',
    'call_requested', 'declined', 'cancelled', 'expired',
    'industry_signed', 'checkout_started', 'payment_processing', 'payment_succeeded',
    'payment_failed', 'refunded', 'dispute_opened', 'dispute_closed'
  )),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  stripe_event_id text,
  created_at timestamptz not null default now()
);

create unique index if not exists booking_deal_memo_events_stripe_event_uidx
  on public.booking_deal_memo_events (stripe_event_id)
  where stripe_event_id is not null;

create index if not exists idx_booking_deal_memo_events_memo
  on public.booking_deal_memo_events (memo_id, created_at);

comment on table public.booking_deal_memo_events is
  'MOT-94 append-only negotiation/payment audit. stripe_event_id makes webhook processing idempotent.';

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.booking_is_client_role()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(auth.role(), '') in ('authenticated', 'anon');
$$;

comment on function public.booking_is_client_role() is
  'True for PostgREST requests carrying an end-user or anon JWT. Service role and direct DB sessions return false.';

create or replace function public.trg_booking_deal_memos_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_availability record;
  v_shells text[];
  v_allowed text[];
begin
  -- `projects` delete cascades project_id → null in the caller's session; allow only that.
  if tg_op = 'UPDATE'
    and old.project_id is not null
    and new.project_id is null
    and (to_jsonb(new) - 'project_id') = (to_jsonb(old) - 'project_id') then
    new.updated_at := now();
    new.version := old.version + 1;
    return new;
  end if;

  if public.booking_is_client_role() then
    raise exception 'booking_deal_memos_service_role_only'
      using hint = 'Use the booking-deal-memo-* Edge Functions.';
  end if;

  new.updated_at := now();

  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'booking_deal_memo_must_start_as_draft';
    end if;

    select a.requester_id, a.talent_id, a.status, a.response_kind, a.project_id
      into v_availability
    from public.availability_check_requests a
    where a.id = new.availability_check_request_id;

    if not found
      or v_availability.requester_id is distinct from new.industry_user_id
      or v_availability.talent_id is distinct from new.talent_user_id
      or v_availability.status is distinct from 'submitted'
      or coalesce(v_availability.response_kind, '') not in ('available', 'available_with_conflict') then
      raise exception 'AVAILABILITY_NOT_ELIGIBLE';
    end if;

    if new.project_id is null then
      new.project_id := v_availability.project_id;
    end if;

    select coalesce(p.enabled_shells, '{}'::text[]) into v_shells
    from public.profiles p
    where p.user_id = new.industry_user_id;

    if v_shells is null or not ('lookingForTalent' = any (v_shells)) or 'community' = any (v_shells) then
      raise exception 'COMMUNITY_NOT_ALLOWED';
    end if;

    new.version := 1;
    return new;
  end if;

  -- UPDATE
  if new.id is distinct from old.id
    or new.availability_check_request_id is distinct from old.availability_check_request_id
    or new.industry_user_id is distinct from old.industry_user_id
    or new.talent_user_id is distinct from old.talent_user_id
    or new.template_key is distinct from old.template_key
    or new.project_id is distinct from old.project_id and new.project_id is not null
    or new.created_at is distinct from old.created_at then
    raise exception 'booking_deal_memo_identity_immutable';
  end if;

  new.version := old.version + 1;

  if new.status is distinct from old.status then
    v_allowed := case old.status
      when 'draft' then array['offered', 'cancelled']
      when 'offered' then array['negotiating', 'payment_pending', 'declined', 'cancelled']
      when 'negotiating' then array['payment_pending', 'declined', 'cancelled']
      when 'accepted' then array['payment_pending', 'cancelled']
      when 'payment_pending' then array['paid', 'expired', 'declined', 'cancelled']
      when 'paid' then array['cancelled']
      -- A PaymentIntent confirmed just before expiry can still succeed; the money is real.
      when 'expired' then array['paid']
      else array[]::text[]
    end;
    if not (new.status = any (v_allowed)) then
      raise exception 'booking_deal_memo_invalid_transition % -> %', old.status, new.status;
    end if;
  elsif old.status in ('declined', 'cancelled', 'expired') and old.paid_at is null then
    raise exception 'booking_deal_memo_terminal';
  end if;

  -- Money snapshot and legal versions freeze at mutual accept.
  if old.status in ('payment_pending', 'paid', 'declined', 'cancelled', 'expired')
    and (
      new.talent_deal_cents is distinct from old.talent_deal_cents
      or new.platform_fee_bps is distinct from old.platform_fee_bps
      or new.platform_fee_cents is distinct from old.platform_fee_cents
      or new.charge_amount_cents is distinct from old.charge_amount_cents
      or new.exhibit_a_version is distinct from old.exhibit_a_version
      or new.eor_version is distinct from old.eor_version
      or new.agency_clause_enabled is distinct from old.agency_clause_enabled
      or new.talent_signed_name is distinct from old.talent_signed_name
      or new.talent_signed_at is distinct from old.talent_signed_at
    ) then
    raise exception 'booking_deal_memo_terms_locked';
  end if;

  if old.status = 'paid'
    and (
      new.stripe_payment_intent_id is distinct from old.stripe_payment_intent_id
      or new.stripe_destination_account_id is distinct from old.stripe_destination_account_id
      or new.paid_at is distinct from old.paid_at
      or new.industry_signed_name is distinct from old.industry_signed_name
      or new.industry_signed_at is distinct from old.industry_signed_at
    ) then
    raise exception 'booking_deal_memo_payment_locked';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_booking_deal_memos_guard on public.booking_deal_memos;
create trigger trg_booking_deal_memos_guard
  before insert or update on public.booking_deal_memos
  for each row
  execute function public.trg_booking_deal_memos_guard();

create or replace function public.trg_booking_deal_memo_provisions_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_memo_id uuid := coalesce(new.memo_id, old.memo_id);
begin
  if public.booking_is_client_role() then
    raise exception 'booking_deal_memo_provisions_service_role_only';
  end if;

  select m.status into v_status from public.booking_deal_memos m where m.id = v_memo_id;
  if not found then
    -- Parent already gone (cascade delete).
    return coalesce(new, old);
  end if;

  if v_status in ('accepted', 'payment_pending', 'paid', 'declined', 'cancelled', 'expired') then
    raise exception 'booking_deal_memo_terms_locked';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if tg_op = 'UPDATE' and (new.memo_id is distinct from old.memo_id or new.module_code is distinct from old.module_code) then
    raise exception 'booking_deal_memo_provision_identity_immutable';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_booking_deal_memo_provisions_guard on public.booking_deal_memo_provisions;
create trigger trg_booking_deal_memo_provisions_guard
  before insert or update or delete on public.booking_deal_memo_provisions
  for each row
  execute function public.trg_booking_deal_memo_provisions_guard();

create or replace function public.trg_booking_deal_memo_events_append_only()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    -- auth.users delete sets actor_user_id → null; nothing else may change.
    if old.actor_user_id is not null
      and new.actor_user_id is null
      and (to_jsonb(new) - 'actor_user_id') = (to_jsonb(old) - 'actor_user_id') then
      return new;
    end if;
    raise exception 'booking_deal_memo_events_append_only';
  end if;
  if public.booking_is_client_role() then
    raise exception 'booking_deal_memo_events_service_role_only';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_booking_deal_memo_events_append_only on public.booking_deal_memo_events;
create trigger trg_booking_deal_memo_events_append_only
  before insert or update on public.booking_deal_memo_events
  for each row
  execute function public.trg_booking_deal_memo_events_append_only();

create or replace function public.trg_booking_payout_accounts_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.booking_is_client_role() then
    raise exception 'booking_payout_accounts_service_role_only';
  end if;
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'booking_payout_account_owner_immutable';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_booking_payout_accounts_guard on public.booking_payout_accounts;
create trigger trg_booking_payout_accounts_guard
  before insert or update on public.booking_payout_accounts
  for each row
  execute function public.trg_booking_payout_accounts_guard();

-- ---------------------------------------------------------------------------
-- Atomic write RPC (service role only)
-- ---------------------------------------------------------------------------

create or replace function public.booking_deal_memo_write(
  p_memo_id uuid,
  p_expected_version int,
  p_create jsonb,
  p_patch jsonb,
  p_provisions jsonb,
  p_event jsonb
) returns public.booking_deal_memos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.booking_deal_memos;
  v_next public.booking_deal_memos;
  v_patch jsonb := coalesce(p_patch, '{}'::jsonb)
    - array['id', 'availability_check_request_id', 'industry_user_id', 'talent_user_id',
            'template_key', 'created_at', 'updated_at', 'version'];
  v_stripe_event_id text := nullif(p_event ->> 'stripe_event_id', '');
begin
  if v_stripe_event_id is not null
    and exists (select 1 from public.booking_deal_memo_events e where e.stripe_event_id = v_stripe_event_id) then
    select * into v_row from public.booking_deal_memos where id = p_memo_id;
    return v_row;
  end if;

  if p_memo_id is null then
    if p_create is null then
      raise exception 'booking_deal_memo_create_payload_required';
    end if;
    insert into public.booking_deal_memos (
      availability_check_request_id, project_id, industry_user_id, talent_user_id,
      template_key, template_version, soft_kind_snapshot, idempotency_key
    ) values (
      (p_create ->> 'availability_check_request_id')::uuid,
      nullif(p_create ->> 'project_id', '')::uuid,
      (p_create ->> 'industry_user_id')::uuid,
      (p_create ->> 'talent_user_id')::uuid,
      coalesce(p_create ->> 'template_key', 'tour_live_dancer'),
      coalesce((p_create ->> 'template_version')::int, 1),
      coalesce(p_create -> 'soft_kind_snapshot', '{}'::jsonb),
      nullif(p_create ->> 'idempotency_key', '')
    )
    returning * into v_row;
  else
    select * into v_row from public.booking_deal_memos where id = p_memo_id for update;
    if not found then
      raise exception 'NOT_FOUND';
    end if;
    if p_expected_version is not null and v_row.version <> p_expected_version then
      raise exception 'MEMO_CONFLICT';
    end if;
  end if;

  if p_provisions is not null and jsonb_typeof(p_provisions) = 'array' and jsonb_array_length(p_provisions) > 0 then
    insert into public.booking_deal_memo_provisions (
      memo_id, module_code, section, sort_order, included, value, previous_included, previous_value,
      state, talent_flag, talent_proposed_value, talent_note,
      industry_reply, industry_decline_reason, industry_note
    )
    select
      v_row.id, x.module_code, x.section, coalesce(x.sort_order, 0), coalesce(x.included, true),
      coalesce(x.value, '{}'::jsonb), x.previous_included, x.previous_value,
      coalesce(x.state, 'pending'), x.talent_flag, x.talent_proposed_value, x.talent_note,
      x.industry_reply, x.industry_decline_reason, x.industry_note
    from jsonb_to_recordset(p_provisions) as x(
      module_code text, section text, sort_order int, included boolean, value jsonb,
      previous_included boolean, previous_value jsonb, state text, talent_flag text,
      talent_proposed_value jsonb, talent_note text, industry_reply text,
      industry_decline_reason text, industry_note text
    )
    on conflict (memo_id, module_code) do update set
      section = excluded.section,
      sort_order = excluded.sort_order,
      included = excluded.included,
      value = excluded.value,
      previous_included = excluded.previous_included,
      previous_value = excluded.previous_value,
      state = excluded.state,
      talent_flag = excluded.talent_flag,
      talent_proposed_value = excluded.talent_proposed_value,
      talent_note = excluded.talent_note,
      industry_reply = excluded.industry_reply,
      industry_decline_reason = excluded.industry_decline_reason,
      industry_note = excluded.industry_note;
  end if;

  if v_patch <> '{}'::jsonb then
    v_next := jsonb_populate_record(v_row, v_patch);
    update public.booking_deal_memos set
      project_id = v_next.project_id,
      soft_kind_snapshot = v_next.soft_kind_snapshot,
      status = v_next.status,
      awaiting_party = v_next.awaiting_party,
      negotiation_round = v_next.negotiation_round,
      cover_note = v_next.cover_note,
      currency = v_next.currency,
      talent_deal_cents = v_next.talent_deal_cents,
      platform_fee_bps = v_next.platform_fee_bps,
      platform_fee_cents = v_next.platform_fee_cents,
      charge_amount_cents = v_next.charge_amount_cents,
      agency_clause_enabled = v_next.agency_clause_enabled,
      exhibit_a_version = v_next.exhibit_a_version,
      eor_version = v_next.eor_version,
      talent_signed_name = v_next.talent_signed_name,
      talent_signed_at = v_next.talent_signed_at,
      industry_signed_name = v_next.industry_signed_name,
      industry_signed_at = v_next.industry_signed_at,
      stripe_destination_account_id = v_next.stripe_destination_account_id,
      stripe_payment_intent_id = v_next.stripe_payment_intent_id,
      stripe_checkout_session_id = v_next.stripe_checkout_session_id,
      stripe_charge_id = v_next.stripe_charge_id,
      payment_state = v_next.payment_state,
      amount_refunded_cents = v_next.amount_refunded_cents,
      paid_at = v_next.paid_at,
      declined_by = v_next.declined_by,
      decline_reason = v_next.decline_reason,
      decline_note = v_next.decline_note,
      offered_at = v_next.offered_at,
      accepted_at = v_next.accepted_at,
      expires_at = v_next.expires_at,
      declined_at = v_next.declined_at,
      cancelled_at = v_next.cancelled_at
    where id = v_row.id
    returning * into v_row;
  end if;

  if p_event is not null and nullif(p_event ->> 'action', '') is not null then
    insert into public.booking_deal_memo_events (memo_id, actor_user_id, actor_role, action, payload, stripe_event_id)
    values (
      v_row.id,
      nullif(p_event ->> 'actor_user_id', '')::uuid,
      coalesce(p_event ->> 'actor_role', 'system'),
      p_event ->> 'action',
      coalesce(p_event -> 'payload', '{}'::jsonb),
      v_stripe_event_id
    );
  end if;

  return v_row;
end;
$$;

comment on function public.booking_deal_memo_write(uuid, int, jsonb, jsonb, jsonb, jsonb) is
  'MOT-94 atomic memo write for Edge Functions: optional create, provision upserts, whitelisted memo patch, audit event. Raises MEMO_CONFLICT on version mismatch; no-op when the Stripe event was already recorded.';

revoke all on function public.booking_deal_memo_write(uuid, int, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.booking_deal_memo_write(uuid, int, jsonb, jsonb, jsonb, jsonb) to service_role;

-- Unpaid Ready for payment expiry. Schedule with pg_cron (e.g. hourly) once applied.
create or replace function public.booking_deal_memos_expire_stale()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_memo record;
begin
  for v_memo in
    select id from public.booking_deal_memos
    where status = 'payment_pending'
      and expires_at is not null
      and expires_at <= now()
      and payment_state not in ('processing', 'succeeded')
    for update skip locked
  loop
    update public.booking_deal_memos
      set status = 'expired', awaiting_party = null
      where id = v_memo.id;
    insert into public.booking_deal_memo_events (memo_id, actor_role, action, payload)
    values (v_memo.id, 'system', 'expired', '{}'::jsonb);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

comment on function public.booking_deal_memos_expire_stale() is
  'Expires unpaid Ready for payment memos past expires_at. Service role / pg_cron only.';

revoke all on function public.booking_deal_memos_expire_stale() from public, anon, authenticated;
grant execute on function public.booking_deal_memos_expire_stale() to service_role;

-- Either party may ask whether the talent can receive the booking payment (Pay gate).
create or replace function public.booking_deal_memo_payout_ready(p_memo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(bool_or(a.stripe_transfers_status = 'active'), false)
  from public.booking_deal_memos m
  left join public.booking_payout_accounts a on a.user_id = m.talent_user_id
  where m.id = p_memo_id
    and (m.industry_user_id = (select auth.uid()) or m.talent_user_id = (select auth.uid()));
$$;

comment on function public.booking_deal_memo_payout_ready(uuid) is
  'True when the memo talent has an active booking recipient (stripe_transfers). Parties only; no account ids are exposed.';

revoke all on function public.booking_deal_memo_payout_ready(uuid) from public, anon;
grant execute on function public.booking_deal_memo_payout_ready(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------

alter table public.booking_payout_accounts enable row level security;
alter table public.booking_deal_memos enable row level security;
alter table public.booking_deal_memo_provisions enable row level security;
alter table public.booking_deal_memo_events enable row level security;

drop policy if exists booking_payout_accounts_select_own on public.booking_payout_accounts;
create policy booking_payout_accounts_select_own
  on public.booking_payout_accounts
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Drafts stay private to Industry until sent.
drop policy if exists booking_deal_memos_select_parties on public.booking_deal_memos;
create policy booking_deal_memos_select_parties
  on public.booking_deal_memos
  for select
  to authenticated
  using (
    industry_user_id = (select auth.uid())
    or (talent_user_id = (select auth.uid()) and status <> 'draft')
  );

drop policy if exists booking_deal_memo_provisions_select_parties on public.booking_deal_memo_provisions;
create policy booking_deal_memo_provisions_select_parties
  on public.booking_deal_memo_provisions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.booking_deal_memos m
      where m.id = booking_deal_memo_provisions.memo_id
        and (
          m.industry_user_id = (select auth.uid())
          or (m.talent_user_id = (select auth.uid()) and m.status <> 'draft')
        )
    )
  );

drop policy if exists booking_deal_memo_events_select_parties on public.booking_deal_memo_events;
create policy booking_deal_memo_events_select_parties
  on public.booking_deal_memo_events
  for select
  to authenticated
  using (
    exists (
      select 1 from public.booking_deal_memos m
      where m.id = booking_deal_memo_events.memo_id
        and (
          m.industry_user_id = (select auth.uid())
          or (m.talent_user_id = (select auth.uid()) and m.status <> 'draft')
        )
    )
  );

revoke all on public.booking_payout_accounts from anon, authenticated;
revoke all on public.booking_deal_memos from anon, authenticated;
revoke all on public.booking_deal_memo_provisions from anon, authenticated;
revoke all on public.booking_deal_memo_events from anon, authenticated;

grant select on public.booking_payout_accounts to authenticated;
grant select on public.booking_deal_memos to authenticated;
grant select on public.booking_deal_memo_provisions to authenticated;
grant select on public.booking_deal_memo_events to authenticated;

grant all on public.booking_payout_accounts to service_role;
grant all on public.booking_deal_memos to service_role;
grant all on public.booking_deal_memo_provisions to service_role;
grant all on public.booking_deal_memo_events to service_role;
