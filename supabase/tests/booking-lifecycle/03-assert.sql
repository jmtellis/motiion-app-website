\set ON_ERROR_STOP on

SELECT CASE
  WHEN public.booking_unconfirmed_work_has_passed(
    '00000000-0000-0000-0000-0000000000b1',
    '2026-10-22T12:00:00Z'
  ) THEN 'PASS unanswered project dates move to history'
  ELSE 'FAIL unanswered project dates move to history'
END;

SELECT CASE
  WHEN NOT public.booking_unconfirmed_work_has_passed(
    '00000000-0000-0000-0000-0000000000b2',
    '2026-10-22T18:00:00Z'
  ) THEN 'PASS multi-day booking stays open before the last day'
  ELSE 'FAIL multi-day booking stays open before the last day'
END;

SELECT CASE
  WHEN public.booking_unconfirmed_work_has_passed(
    '00000000-0000-0000-0000-0000000000b2',
    '2026-10-25T00:00:00Z'
  ) THEN 'PASS multi-day booking closes after the last day'
  ELSE 'FAIL multi-day booking closes after the last day'
END;

SELECT CASE
  WHEN NOT public.booking_unconfirmed_work_has_passed(
    '00000000-0000-0000-0000-0000000000b3',
    '2026-10-21T17:00:00Z'
  )
  AND public.booking_unconfirmed_work_has_passed(
    '00000000-0000-0000-0000-0000000000b3',
    '2026-10-21T18:00:00Z'
  ) THEN 'PASS project schedule end time closes the booking'
  ELSE 'FAIL project schedule end time closes the booking'
END;

SELECT CASE
  WHEN NOT public.booking_unconfirmed_work_has_passed(
    '00000000-0000-0000-0000-0000000000b4',
    '2026-12-01T00:00:00Z'
  )
  AND NOT public.booking_unconfirmed_work_has_passed(
    '00000000-0000-0000-0000-0000000000b5',
    '2026-12-01T00:00:00Z'
  ) THEN 'PASS missing and ongoing dates stay open'
  ELSE 'FAIL missing and ongoing dates stay open'
END;

SELECT CASE
  WHEN NOT public.booking_unconfirmed_work_has_passed(
    '00000000-0000-0000-0000-0000000000b6',
    '2026-12-01T00:00:00Z'
  ) THEN 'PASS confirmed participation stays open after the work dates'
  ELSE 'FAIL confirmed participation stays open after the work dates'
END;

SELECT CASE
  WHEN NOT public.booking_unconfirmed_work_has_passed(
    '00000000-0000-0000-0000-0000000000b7',
    '2026-10-23T00:30:00Z'
  )
  AND public.booking_unconfirmed_work_has_passed(
    '00000000-0000-0000-0000-0000000000b7',
    '2026-10-23T01:00:00Z'
  ) THEN 'PASS final workday uses the booking timezone'
  ELSE 'FAIL final workday uses the booking timezone'
END;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000aa', false);

DO $$
BEGIN
  BEGIN
    PERFORM public.booking_request_confirmation('00000000-0000-0000-0000-0000000000b8');
    RAISE EXCEPTION 'confirmation was allowed after the work dates';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('booking_work_dates_passed' IN SQLERRM) = 0 THEN
        RAISE;
      END IF;
  END;
END $$;

SELECT 'PASS confirmation request is rejected after the work dates';

DO $$
DECLARE
  v_id uuid;
BEGIN
  v_id := public.booking_request_confirmation('00000000-0000-0000-0000-0000000000b2');
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'open confirmation returned null';
  END IF;
END $$;

SELECT 'PASS confirmation request stays available while work continues';

INSERT INTO public.booking_confirmation_requests (
  id, requester_id, talent_id, booking_id, title, status
) VALUES (
  '00000000-0000-0000-0000-0000000000c1',
  '00000000-0000-0000-0000-0000000000aa',
  '00000000-0000-0000-0000-0000000000bb',
  '00000000-0000-0000-0000-0000000000b8',
  'Past confirmation',
  'pending'
);

DO $$
BEGIN
  BEGIN
    UPDATE public.booking_confirmation_requests
    SET status = 'confirmed'
    WHERE id = '00000000-0000-0000-0000-0000000000c1';
    RAISE EXCEPTION 'confirmation response was accepted after the work dates';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('booking_work_dates_passed' IN SQLERRM) = 0 THEN
        RAISE;
      END IF;
  END;
END $$;

SELECT CASE
  WHEN status = 'pending'
  THEN 'PASS confirmation response rolls back after the work dates'
  ELSE 'FAIL confirmation response rolls back after the work dates'
END
FROM public.booking_confirmation_requests
WHERE id = '00000000-0000-0000-0000-0000000000c1';

SELECT CASE
  WHEN status = 'on_hold'
  THEN 'PASS the booking stays unconfirmed when the response rolls back'
  ELSE 'FAIL the booking stays unconfirmed when the response rolls back'
END
FROM public.bookings
WHERE id = '00000000-0000-0000-0000-0000000000b8';
