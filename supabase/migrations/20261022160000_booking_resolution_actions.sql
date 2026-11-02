-- Idempotency receipts are private; clients use the validated RPC only.
create table public.booking_resolution_receipts (
  id uuid primary key,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  actor_id uuid not null,
  action text not null check (action in ('close', 'reschedule', 'report_work')),
  created_at timestamptz not null default now()
);
create index booking_resolution_receipts_booking_action on public.booking_resolution_receipts(booking_id, action);
alter table public.booking_resolution_receipts enable row level security;
revoke all on public.booking_resolution_receipts from public, anon, authenticated;

-- Explicit recovery for unconfirmed engagements. No signatures, payment rows, or old memos are rewritten.
create or replace function public.booking_resolve_unconfirmed(
  p_booking_id uuid,
  p_action text,
  p_date_ranges jsonb,
  p_timezone text,
  p_resolution_id uuid
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_request uuid;
  v_title text;
  v_day date;
  v_range jsonb;
begin
  if v_uid is null then raise exception 'booking_auth_required' using errcode = '28000'; end if;
  if p_action not in ('close', 'reschedule', 'report_work') or p_action is null or p_resolution_id is null then
    raise exception 'booking_resolution_invalid';
  end if;
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if v_booking.industry_user_id <> v_uid or v_booking.talent_user_id = v_uid then
    raise exception 'booking_forbidden' using errcode = '42501';
  end if;
  -- Retrying a successful request must not create another availability request.
  if exists (select 1 from public.booking_resolution_receipts where booking_id = p_booking_id
      and id = p_resolution_id and actor_id = v_uid and action = p_action) then return v_booking; end if;
  if v_booking.confirmed_at is not null or v_booking.status not in ('availability', 'on_hold', 'offer', 'contract') then
    raise exception 'booking_resolution_invalid_status';
  end if;
  if p_action = 'report_work' then
    if not public.booking_unconfirmed_work_has_passed(p_booking_id) then
      raise exception 'booking_resolution_invalid_status';
    end if;
    if not exists(select 1 from public.booking_resolution_receipts where booking_id = p_booking_id and action = 'report_work') then
      perform public.booking_append_event(p_booking_id, v_uid, 'industry', 'status_changed', v_booking.status, v_booking.status,
        jsonb_build_object('resolution', 'report_work', 'resolution_id', p_resolution_id));
    end if;
    insert into public.booking_resolution_receipts(id, booking_id, actor_id, action)
      values (p_resolution_id, p_booking_id, v_uid, p_action);
    return v_booking;
  end if;
  if exists(select 1 from public.booking_resolution_receipts where booking_id = p_booking_id and action = 'report_work') then
    raise exception 'booking_resolution_agreement_requires_review';
  end if;
  -- Include historical memos: replacing a pointer must never hide a payment or signed agreement.
  perform 1 from public.booking_deal_memos m
    where m.booking_id = p_booking_id or m.id = v_booking.deal_memo_id
       or m.availability_check_request_id = v_booking.availability_check_request_id
    for update;
  if exists (
    select 1 from public.booking_deal_memos m
    where (m.booking_id = p_booking_id or m.id = v_booking.deal_memo_id
       or m.availability_check_request_id = v_booking.availability_check_request_id)
      and (m.status not in ('expired', 'declined', 'cancelled')
        or m.talent_signed_at is not null or m.industry_signed_at is not null
        or m.payment_state in ('processing', 'succeeded', 'refunded', 'partially_refunded', 'disputed'))
  ) or exists (select 1 from public.booking_executed_contracts where booking_id = p_booking_id and status = 'active') then
    raise exception 'booking_resolution_agreement_requires_review';
  end if;
  if p_action = 'reschedule' then
    if p_timezone is null or not exists (select 1 from pg_timezone_names where name = p_timezone) then
      raise exception 'booking_resolution_invalid_timezone';
    end if;
    if p_date_ranges is null or jsonb_typeof(p_date_ranges) <> 'array' then raise exception 'booking_availability_empty'; end if;
    if jsonb_array_length(p_date_ranges) not between 1 and 366 then raise exception 'booking_availability_empty'; end if;
    for v_range in select value from jsonb_array_elements(p_date_ranges) loop
      v_day := public.booking_safe_date(v_range ->> 'date');
      if v_day is null or v_day <= (now() at time zone p_timezone)::date then
        raise exception 'booking_resolution_dates_must_be_future';
      end if;
    end loop;
  end if;
  update public.booking_confirmation_requests set status = 'cancelled', updated_at = now()
    where booking_id = p_booking_id and status = 'pending';
  update public.availability_check_requests set status = 'cancelled', updated_at = now()
    where id = v_booking.availability_check_request_id and status in ('pending', 'submitted');
  if p_action = 'close' then
    update public.bookings set status = 'cancelled', cancelled_at = now(), updated_at = now()
      where id = p_booking_id;
  else
    select coalesce(nullif(trim(title), ''), 'Booking') into v_title from public.projects where id = v_booking.project_id;
    insert into public.availability_check_requests
      (requester_id, talent_id, title, message, project_name, project_id, date_ranges, timezone, idempotency_key)
    values (v_uid, v_booking.talent_user_id, 'Updated dates: ' || v_title,
      'Please confirm your availability for these new work dates. Previous confirmation does not apply.',
      v_title, v_booking.project_id, p_date_ranges, p_timezone, 'booking-reschedule:' || p_resolution_id::text)
    returning id into v_request;
    update public.bookings set status = 'availability', date_ranges = p_date_ranges, timezone = p_timezone,
      availability_check_request_id = v_request, deal_memo_id = null, hold_placed_at = null,
      hold_released_at = case when status = 'on_hold' then now() else hold_released_at end, updated_at = now()
      where id = p_booking_id;
  end if;
  perform public.booking_append_event(p_booking_id, v_uid, 'industry',
    case when p_action = 'close' then 'cancelled' else 'availability_linked' end,
    v_booking.status, case when p_action = 'close' then 'cancelled' else 'availability' end,
    jsonb_build_object('resolution', p_action, 'resolution_id', p_resolution_id,
      'previous_date_ranges', v_booking.date_ranges, 'previous_memo_id', v_booking.deal_memo_id,
      'previous_availability_request_id', v_booking.availability_check_request_id,
      'availability_check_request_id', v_request));
  insert into public.booking_resolution_receipts(id, booking_id, actor_id, action)
    values (p_resolution_id, p_booking_id, v_uid, p_action);
  select * into v_booking from public.bookings where id = p_booking_id;
  return v_booking;
end;
$function$;
revoke all on function public.booking_resolve_unconfirmed(uuid, text, jsonb, text, uuid) from public, anon;
grant execute on function public.booking_resolve_unconfirmed(uuid, text, jsonb, text, uuid) to authenticated;

-- Serialize a new agreement with resolution so a concurrent create cannot reopen a closed booking.
create or replace function public.booking_resolution_guard_new_memo()
returns trigger language plpgsql security definer set search_path = public as $function$
declare v_booking public.bookings%rowtype;
begin
  select * into v_booking from public.bookings
    where id = new.booking_id or (new.booking_id is null and availability_check_request_id = new.availability_check_request_id)
    order by id limit 1 for update;
  if found and v_booking.status in ('cancelled', 'declined', 'removed', 'expired', 'released', 'unavailable', 'completed') then
    raise exception 'BOOKING_NOT_ELIGIBLE';
  end if;
  return new;
end;
$function$;
revoke all on function public.booking_resolution_guard_new_memo() from public, anon, authenticated;
create trigger booking_resolution_guard_new_memo
  before insert on public.booking_deal_memos
  for each row execute function public.booking_resolution_guard_new_memo();
