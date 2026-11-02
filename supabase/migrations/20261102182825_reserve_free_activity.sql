-- Authenticated counterpart to the existing public free guest registration.
-- Guest-spot requests (organizer approval) and paid admissions remain separate.
create or replace function public.reserve_free_activity(p_activity_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_activity public.activities%rowtype;
  v_status text;
  v_offer uuid;
  v_count integer;
  v_enrollment uuid;
  v_day public.activity_event_days%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.profiles p where p.user_id = v_uid
    and coalesce(p.moderation_status, 'active') = 'active') then
    raise exception 'account_unavailable';
  end if;
  select * into v_activity from public.activities where id = p_activity_id for update;
  if not found then raise exception 'activity_unavailable'; end if;
  if v_activity.type not in ('class', 'event') or v_activity.status <> 'active'
     or coalesce(v_activity.is_private, false)
     or coalesce(v_activity.require_payment, false)
     or coalesce(v_activity.external_ticket_purchase_enabled, false)
     or v_activity.activity_date is null
     or v_activity.activity_date < (now() at time zone 'UTC')::date then
    raise exception 'activity_not_open_for_free_registration';
  end if;
  if public.user_can_manage_activity(p_activity_id, v_uid) then raise exception 'already_organizer'; end if;
  if public.are_users_blocked(v_uid, v_activity.creator_id) then raise exception 'activity_unavailable'; end if;
  if not exists (select 1 from public.profiles p where p.user_id = v_activity.creator_id
    and coalesce(p.moderation_status, 'active') = 'active') then raise exception 'activity_unavailable'; end if;

  select status into v_status from public.enrollments
    where activity_id = p_activity_id and student_id = v_uid;
  if v_status in ('paid', 'guest', 'comped') then
    return jsonb_build_object('ok', true, 'status', v_status, 'already_registered', true);
  end if;

  -- Free events use general admission to their scheduled days. Paid ticket
  -- configurations must go through checkout even if a stale editor flag says
  -- otherwise; this RPC never grants a priced ticket or bypasses day capacity.
  if v_activity.type = 'event' and exists (select 1 from public.activity_ticket_options
    where activity_id = p_activity_id and is_active and amount_cents > 0) then
    raise exception 'activity_not_open_for_free_registration';
  end if;
  for v_day in select * from public.activity_event_days where activity_id = p_activity_id order by id for update loop
    if v_day.max_attendees is not null then
      select count(*) into v_count from public.enrollment_event_day_entitlements d
        join public.enrollments e on e.id = d.enrollment_id
        where d.event_day_id = v_day.id and d.status = 'active' and e.status in ('paid', 'guest', 'comped');
      if v_count >= v_day.max_attendees then raise exception 'activity_full'; end if;
    end if;
  end loop;

  -- Match shared checkout capacity and waitlist precedence. A queued person
  -- cannot claim a seat before receiving an unexpired offer.
  if v_activity.max_attendees is not null then
    select count(*) into v_count from public.enrollments
      where activity_id = p_activity_id and status in ('paid', 'guest', 'comped');
    if v_count >= v_activity.max_attendees then raise exception 'activity_full'; end if;
    if exists (select 1 from public.activity_waitlist_entries where activity_id = p_activity_id
        and status in ('queued', 'offered', 'accepted')) then
      select id into v_offer from public.activity_waitlist_entries
        where activity_id = p_activity_id and user_id = v_uid and status in ('offered', 'accepted')
          and (offer_expires_at is null or offer_expires_at > now())
          and nullif(pricing_tier_id, '') is null
        order by offered_at desc nulls last limit 1 for update;
      if v_offer is null then raise exception 'reserved_for_waitlist'; end if;
    end if;
  end if;
  -- Re-enrollment restores the existing unique row; historical payment records
  -- remain intact. Do not retain old ticket/refund/organizer-grant metadata.
  insert into public.enrollments(activity_id, student_id, status)
    values (p_activity_id, v_uid, 'guest')
  on conflict (activity_id, student_id) do update set status = 'guest',
    pricing_tier_id = null, ticket_option_id = null, refund_requested_at = null,
    comped_by = null, comp_source = null, updated_at = now()
  returning id into v_enrollment;
  insert into public.enrollment_event_day_entitlements(enrollment_id, event_day_id, source, status)
    select v_enrollment, id, 'guest', 'active' from public.activity_event_days where activity_id = p_activity_id
  on conflict (enrollment_id, event_day_id) do update set status = 'active', source = 'guest', updated_at = now();
  for v_day in select * from public.activity_event_days where activity_id = p_activity_id loop
    perform public.sync_event_day_spots_remaining(v_day.id);
  end loop;
  if v_offer is not null then
    update public.activity_waitlist_entries set status = 'promoted', responded_at = now(), updated_at = now()
      where id = v_offer;
  end if;
  -- Existing enrollment triggers update capacity, calendar audience and Inbox.
  return jsonb_build_object('ok', true, 'status', 'guest', 'already_registered', false);
end;
$$;
revoke all on function public.reserve_free_activity(uuid) from public, anon;
grant execute on function public.reserve_free_activity(uuid) to authenticated;
