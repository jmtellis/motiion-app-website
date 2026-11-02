-- Existing conflict recording is informational, not a reason to lose a talent response.
-- Preserve historical actions; permit the value already emitted by
-- booking_record_date_conflicts when hold/confirmation dates overlap.
alter table public.booking_events drop constraint booking_events_action_check;
alter table public.booking_events add constraint booking_events_action_check check (
  action = any (array[
    'created_handoff', 'created_direct', 'availability_linked',
    'hold_placed', 'hold_released', 'status_changed', 'deal_memo_linked',
    'confirmed_from_memo', 'cancelled', 'notified_talent',
    'confirmation_requested', 'conflict_detected'
  ]::text[])
) not valid;
alter table public.booking_events validate constraint booking_events_action_check;
