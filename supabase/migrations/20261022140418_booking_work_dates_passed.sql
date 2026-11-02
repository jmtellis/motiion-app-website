-- Stop confirmation, and expose the same work-window instant the clients use,
-- once the final workday has ended and participation was never confirmed.

create or replace function public.booking_safe_date(p_text text)
returns date
language plpgsql
immutable
as $function$
begin
  if p_text is null or btrim(p_text) !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return null;
  end if;
  return btrim(p_text)::date;
exception
  when others then
    return null;
end;
$function$;

create or replace function public.booking_final_work_instant(
  p_ranges jsonb,
  p_time_zone text
)
returns timestamptz
language plpgsql
stable
as $function$
declare
  v_tz text := 'UTC';
  v_item jsonb;
  v_day date;
  v_end text;
  v_final date;
  v_all_day boolean := false;
  v_latest interval;
  v_candidate interval;
  v_hour int;
  v_minute int;
  v_second int;
begin
  if p_ranges is null or jsonb_typeof(p_ranges) <> 'array' or jsonb_array_length(p_ranges) = 0 then
    return null;
  end if;
  if p_time_zone is not null and exists (select 1 from pg_timezone_names where name = p_time_zone) then
    v_tz := p_time_zone;
  end if;

  select max(public.booking_safe_date(item->>'date'))
  into v_final
  from jsonb_array_elements(p_ranges) item;

  if v_final is null then
    return null;
  end if;

  for v_item in select value from jsonb_array_elements(p_ranges)
  loop
    v_day := public.booking_safe_date(v_item->>'date');
    if v_day is distinct from v_final then
      continue;
    end if;
    v_end := btrim(coalesce(v_item->>'end_time', ''));
    if v_end = '' or v_end !~ '^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$' then
      v_all_day := true;
    else
      v_hour := split_part(v_end, ':', 1)::int;
      v_minute := split_part(v_end, ':', 2)::int;
      v_second := coalesce(nullif(split_part(v_end, ':', 3), '')::int, 0);
      v_candidate := make_interval(hours => v_hour, mins => v_minute, secs => v_second);
      if v_latest is null or v_candidate > v_latest then
        v_latest := v_candidate;
      end if;
    end if;
  end loop;

  begin
    if v_all_day or v_latest is null then
      return ((v_final + 1)::timestamp) at time zone v_tz;
    end if;
    return (v_final::timestamp + v_latest) at time zone v_tz;
  exception
    when others then
      return null;
  end;
end;
$function$;

create or replace function public.booking_applicable_work_ranges(
  p_booking_ranges jsonb,
  p_project_details jsonb,
  p_project_start date,
  p_project_end date,
  p_casting jsonb
)
returns jsonb
language plpgsql
stable
as $function$
declare
  v_details jsonb := coalesce(p_project_details, '{}'::jsonb);
  v_casting jsonb := coalesce(p_casting, '{}'::jsonb);
  v_from_booking jsonb;
  v_from_categories jsonb;
  v_start date;
  v_end date;
begin
  select coalesce(jsonb_agg(item), '[]'::jsonb)
  into v_from_booking
  from jsonb_array_elements(coalesce(p_booking_ranges, '[]'::jsonb)) item
  where public.booking_safe_date(item->>'date') is not null;

  if jsonb_array_length(v_from_booking) > 0 then
    return v_from_booking;
  end if;

  if coalesce(v_details->>'dates_not_confirmed', '') = 'true'
     or coalesce(v_casting->>'production_dates_not_known_confirmed', '') = 'true' then
    return '[]'::jsonb;
  end if;

  with cats as (
    select cat
    from jsonb_array_elements(coalesce(v_details->'schedule_categories', '[]'::jsonb)) cat
    where jsonb_typeof(cat) = 'object'
  ),
  days as (
    select
      public.booking_safe_date(day_text) as day,
      nullif(btrim(cat->'end_time_by_day'->>day_text), '') as end_time
    from cats
    cross join lateral jsonb_array_elements_text(coalesce(cat->'selected_days_yyyymmdd', '[]'::jsonb)) as day_text
  ),
  grouped as (
    select
      day,
      case
        when bool_or(end_time is null or end_time !~ '^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$') then null
        else max(end_time) filter (
          where end_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
        )
      end as end_time
    from days
    where day is not null
    group by day
  )
  select coalesce(
    jsonb_agg(jsonb_build_object('date', to_char(day, 'YYYY-MM-DD'), 'end_time', end_time)),
    '[]'::jsonb
  )
  into v_from_categories
  from grouped;

  if jsonb_array_length(v_from_categories) > 0 then
    return v_from_categories;
  end if;

  v_start := public.booking_safe_date(v_details->>'start_date');
  v_end := public.booking_safe_date(v_details->>'end_date');
  if v_start is null and v_end is null then
    v_start := p_project_start;
    v_end := p_project_end;
  elsif v_start is not null and v_end is null then
    return '[]'::jsonb;
  end if;

  if v_start is not null and v_end is null then
    return '[]'::jsonb;
  end if;
  if v_end is null then
    return '[]'::jsonb;
  end if;
  return jsonb_build_array(jsonb_build_object('date', to_char(v_end, 'YYYY-MM-DD')));
end;
$function$;

create or replace function public.booking_unconfirmed_work_has_passed(
  p_booking_id uuid,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
stable
as $function$
declare
  v_status text;
  v_confirmed timestamptz;
  v_ranges jsonb;
  v_timezone text;
  v_project_id uuid;
  v_details jsonb;
  v_start date;
  v_end date;
  v_casting jsonb;
  v_applicable jsonb;
  v_instant timestamptz;
begin
  select status, confirmed_at, date_ranges, timezone, project_id
  into v_status, v_confirmed, v_ranges, v_timezone, v_project_id
  from public.bookings
  where id = p_booking_id;

  if not found then
    return false;
  end if;
  if v_confirmed is not null or v_status in ('confirmed', 'completed') then
    return false;
  end if;
  if v_status in ('unavailable', 'released', 'declined', 'cancelled', 'removed', 'expired') then
    return false;
  end if;

  select project_details, start_date, end_date, casting_configuration
  into v_details, v_start, v_end, v_casting
  from public.projects
  where id = v_project_id;

  v_applicable := public.booking_applicable_work_ranges(v_ranges, v_details, v_start, v_end, v_casting);
  v_instant := public.booking_final_work_instant(v_applicable, coalesce(v_timezone, 'UTC'));
  if v_instant is null then
    return false;
  end if;
  return v_instant <= p_now;
end;
$function$;

create or replace function public.booking_request_confirmation(p_booking_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_title text;
  v_existing uuid;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'booking_auth_required' using errcode = '28000';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking_not_found' using errcode = 'P0002';
  end if;

  if not public.is_project_operator(v_booking.project_id, v_uid) then
    raise exception 'booking_forbidden' using errcode = '42501';
  end if;

  if v_booking.talent_user_id = v_uid then
    raise exception 'booking_cannot_book_self' using errcode = 'P0001';
  end if;

  if v_booking.status not in ('availability', 'on_hold') then
    raise exception 'booking_confirmation_invalid_status' using errcode = 'P0001';
  end if;

  if public.booking_unconfirmed_work_has_passed(v_booking.id) then
    raise exception 'booking_work_dates_passed' using errcode = 'P0001';
  end if;

  select coalesce(nullif(trim(p.title), ''), 'Booking confirmation')
  into v_title
  from public.projects p
  where p.id = v_booking.project_id;

  select b.id into v_existing
  from public.booking_confirmation_requests b
  where b.booking_id = v_booking.id
    and b.status = 'pending'
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  insert into public.booking_confirmation_requests (
    requester_id,
    talent_id,
    booking_id,
    role_id,
    title,
    status
  ) values (
    v_uid,
    v_booking.talent_user_id,
    v_booking.id,
    v_booking.role_id,
    v_title,
    'pending'
  )
  returning id into v_id;

  perform public.booking_append_event(
    v_booking.id,
    v_uid,
    'industry',
    'confirmation_requested',
    v_booking.status,
    v_booking.status,
    jsonb_build_object('booking_confirmation_request_id', v_id)
  );

  return v_id;
end;
$function$;

create or replace function public.sync_booking_confirmation_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_previous_status text;
begin
  if old.status = 'pending'
     and new.status = 'confirmed'
     and new.booking_id is not null then
    select b.status
    into v_previous_status
    from public.bookings b
    where b.id = new.booking_id
      and b.industry_user_id = new.requester_id
      and b.talent_user_id = new.talent_id
    for update;

    if v_previous_status in ('availability', 'on_hold')
       and public.booking_unconfirmed_work_has_passed(new.booking_id) then
      raise exception 'booking_work_dates_passed' using errcode = 'P0001';
    end if;

    if v_previous_status in ('availability', 'on_hold') then
      update public.bookings
      set
        status = 'confirmed',
        confirmed_at = coalesce(confirmed_at, now()),
        updated_at = now()
      where id = new.booking_id;

      perform public.booking_append_event(
        new.booking_id,
        new.talent_id,
        'talent',
        'status_changed',
        v_previous_status,
        'confirmed',
        jsonb_build_object('booking_confirmation_request_id', new.id)
      );
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.booking_safe_date(text) from public, anon;
revoke all on function public.booking_final_work_instant(jsonb, text) from public, anon;
revoke all on function public.booking_applicable_work_ranges(jsonb, jsonb, date, date, jsonb) from public, anon;
revoke all on function public.booking_unconfirmed_work_has_passed(uuid, timestamptz) from public, anon;
grant execute on function public.booking_unconfirmed_work_has_passed(uuid, timestamptz) to authenticated, service_role;
