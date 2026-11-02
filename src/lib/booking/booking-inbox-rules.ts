import {
  bookingFacingLabel,
  unconfirmedWorkHasPassed,
  type ProjectWorkSchedule,
} from "./booking-lifecycle";

export type BookingSegment = "in-progress" | "confirmed" | "past";
export type InboxBooking = {
  projectTitle?: string | null;
  id: string;
  project_id: string;
  deal_memo_id: string | null;
  availability_check_request_id: string | null;
  status: string;
  work_title: string | null;
  date_ranges:
    { date: string; start_time?: string; end_time?: string }[] | null;
  timezone?: string | null;
  confirmed_at?: string | null;
  projectSchedule?: ProjectWorkSchedule | null;
};
const PAST = new Set([
  "completed",
  "unavailable",
  "released",
  "declined",
  "cancelled",
  "removed",
  "expired",
]);
export function bookingPlacement(booking: InboxBooking, now = Date.now()): BookingSegment {
  if (
    unconfirmedWorkHasPassed({
      status: booking.status,
      confirmedAt: booking.confirmed_at,
      bookingDates: booking.date_ranges,
      schedule: booking.projectSchedule,
      timeZone: booking.timezone,
      now: new Date(now),
    })
  ) {
    return "past";
  }
  return bookingSegment(booking.status);
}

export function bookingSegment(status: string): BookingSegment {
  return PAST.has(status)
    ? "past"
    : status === "confirmed" ||
        status === "accepted" ||
        status === "paid" ||
        status === "booked" ||
        status === "payment_pending"
      ? "confirmed"
      : "in-progress";
}

/** Payment deadlines move a memo to Past even before the server expiry sweep. */
export function memoSegment(
  memo: { status: string; expires_at: string | null; payment_state?: string | null },
  now = Date.now(),
): BookingSegment {
  const paymentProtected =
    memo.payment_state === "processing" || memo.payment_state === "succeeded";
  if (
    !paymentProtected &&
    memo.status === "payment_pending" &&
    memo.expires_at &&
    new Date(memo.expires_at).getTime() <= now
  )
    return "past";
  if (
    ![
      "draft",
      "offered",
      "negotiating",
      "accepted",
      "payment_pending",
      "paid",
      "declined",
      "cancelled",
      "expired",
    ].includes(memo.status)
  )
    return "past";
  return bookingSegment(memo.status);
}

export function inboxBookingLabel(
  booking: InboxBooking,
  memo?: { status: string; expires_at?: string | null; payment_state?: string | null } | null,
  now = Date.now(),
): string {
  return bookingFacingLabel({
    status: booking.status,
    confirmedAt: booking.confirmed_at,
    bookingDates: booking.date_ranges,
    schedule: booking.projectSchedule,
    timeZone: booking.timezone,
    memo,
    now: new Date(now),
  });
}
