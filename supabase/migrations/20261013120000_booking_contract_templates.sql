-- Let deal memos follow the iOS agreement catalog.
-- tour_live_dancer still requires a confirmed availability request.
-- Other template keys may be created from a booking with no availability request.
-- One current agreement path per booking: an active executed-contract upload blocks a new memo.
-- The upload stays a record. This migration does not change participation or payment.

alter table public.booking_deal_memos drop constraint if exists booking_deal_memos_template_key_check;
alter table public.booking_deal_memos add constraint booking_deal_memos_template_key_check
  check (template_key in (
    'tour_live_dancer',
    'award_show',
    'residency',
    'television_film',
    'standard_performance',
    'flat_scope'
  ));

alter table public.booking_deal_memos alter column availability_check_request_id drop not null;

alter table public.booking_deal_memos drop constraint if exists booking_deal_memos_entry_check;
alter table public.booking_deal_memos add constraint booking_deal_memos_entry_check
  check (
    (availability_check_request_id is not null or booking_id is not null)
    and (template_key <> 'tour_live_dancer' or availability_check_request_id is not null)
  );

create unique index if not exists booking_deal_memos_active_booking_uidx
  on public.booking_deal_memos (booking_id)
  where booking_id is not null
    and status not in ('declined', 'cancelled', 'expired');

create or replace function public.trg_booking_deal_memos_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_availability record;
  v_booking public.bookings%rowtype;
  v_shells text[];
  v_allowed text[];
begin
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

    if new.booking_id is not null then
      select * into v_booking from public.bookings where id = new.booking_id;
      if not found
        or v_booking.industry_user_id is distinct from new.industry_user_id
        or v_booking.talent_user_id is distinct from new.talent_user_id then
        raise exception 'BOOKING_NOT_ELIGIBLE';
      end if;
      if exists (
        select 1 from public.booking_executed_contracts c
        where c.booking_id = new.booking_id and c.status = 'active'
      ) then
        raise exception 'EXECUTED_CONTRACT_EXISTS';
      end if;
      if new.project_id is null then
        new.project_id := v_booking.project_id;
      end if;
    end if;

    if new.availability_check_request_id is not null then
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

      if new.booking_id is not null
        and v_booking.availability_check_request_id is not null
        and v_booking.availability_check_request_id is distinct from new.availability_check_request_id then
        raise exception 'BOOKING_NOT_ELIGIBLE';
      end if;

      if new.project_id is null then
        new.project_id := v_availability.project_id;
      end if;
    elsif new.template_key = 'tour_live_dancer' or new.booking_id is null then
      raise exception 'AVAILABILITY_NOT_ELIGIBLE';
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

  if new.id is distinct from old.id
    or new.availability_check_request_id is distinct from old.availability_check_request_id
    or new.booking_id is distinct from old.booking_id
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
      when 'expired' then array['paid']
      else array[]::text[]
    end;
    if not (new.status = any (v_allowed)) then
      raise exception 'booking_deal_memo_invalid_transition % -> %', old.status, new.status;
    end if;
  elsif old.status in ('declined', 'cancelled', 'expired') and old.paid_at is null then
    raise exception 'booking_deal_memo_terminal';
  end if;

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
    - array['id', 'availability_check_request_id', 'booking_id', 'industry_user_id', 'talent_user_id',
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
      availability_check_request_id, booking_id, project_id, industry_user_id, talent_user_id,
      template_key, template_version, soft_kind_snapshot, idempotency_key
    ) values (
      nullif(p_create ->> 'availability_check_request_id', '')::uuid,
      nullif(p_create ->> 'booking_id', '')::uuid,
      nullif(p_create ->> 'project_id', '')::uuid,
      (p_create ->> 'industry_user_id')::uuid,
      (p_create ->> 'talent_user_id')::uuid,
      coalesce(p_create ->> 'template_key', 'tour_live_dancer'),
      coalesce((p_create ->> 'template_version')::int, 1),
      coalesce(p_create -> 'soft_kind_snapshot', '{}'::jsonb),
      nullif(p_create ->> 'idempotency_key', '')
    )
    returning * into v_row;

    -- Link the booking before a status patch so the memo sync can see it.
    -- deal_memo_id is the pointer only; status and payment stay unchanged here.
    if v_row.booking_id is not null then
      update public.bookings b
      set deal_memo_id = v_row.id
      where b.id = v_row.booking_id
        and (
          b.deal_memo_id is null
          or b.deal_memo_id = v_row.id
          or exists (
            select 1 from public.booking_deal_memos m
            where m.id = b.deal_memo_id
              and m.status in ('declined', 'cancelled', 'expired')
          )
        );
      if not found then
        raise exception 'MEMO_EXISTS';
      end if;
    end if;
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
