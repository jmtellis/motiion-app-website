import assert from "node:assert/strict";
import test from "node:test";
import { isMemoExpired } from "../supabase/functions/_shared/booking-deal-memo-template.ts";
import {
  bookingFacingLabel,
  finalWorkInstant,
  projectWorkSchedule,
  unconfirmedWorkHasPassed,
} from "../supabase/functions/_shared/booking-lifecycle.ts";
import {
  bookingPlacement,
  bookingSegment,
  inboxBookingLabel,
  memoSegment,
  type InboxBooking,
} from "../src/lib/booking/booking-inbox-rules.ts";

const utc = "UTC";

function at(iso: string): Date {
  return new Date(iso);
}

function booking(overrides: Partial<InboxBooking> = {}): InboxBooking {
  return {
    id: "booking",
    project_id: "project",
    deal_memo_id: null,
    availability_check_request_id: null,
    status: "offer",
    work_title: "Opening number",
    date_ranges: [{ date: "2026-10-22" }],
    timezone: utc,
    ...overrides,
  };
}

test("an unanswered contract stays open until the final workday ends", () => {
  const open = booking();
  assert.equal(
    unconfirmedWorkHasPassed({
      status: "offer",
      bookingDates: open.date_ranges,
      timeZone: utc,
      now: at("2026-10-22T12:00:00Z"),
    }),
    false,
  );
  assert.equal(bookingPlacement(open, Date.parse("2026-10-22T12:00:00Z")), "in-progress");
  assert.equal(
    unconfirmedWorkHasPassed({
      status: "offer",
      bookingDates: open.date_ranges,
      timeZone: utc,
      now: at("2026-10-23T00:00:00Z"),
    }),
    true,
  );
  assert.equal(bookingPlacement(open, Date.parse("2026-10-23T00:00:00Z")), "past");
  assert.equal(
    inboxBookingLabel(open, { status: "offered", expires_at: null }, Date.parse("2026-10-23T00:00:00Z")),
    "Not confirmed — dates passed",
  );
  assert.equal(bookingSegment("offer"), "in-progress");
});

test("a multi-day booking that has started stays open", () => {
  const row = booking({
    date_ranges: [{ date: "2026-10-20" }, { date: "2026-10-24" }],
  });
  assert.equal(bookingPlacement(row, Date.parse("2026-10-22T18:00:00Z")), "in-progress");
  assert.equal(bookingPlacement(row, Date.parse("2026-10-25T00:00:00Z")), "past");
});

test("missing dates and ongoing work do not close the booking", () => {
  assert.equal(
    unconfirmedWorkHasPassed({
      status: "on_hold",
      bookingDates: null,
      timeZone: utc,
      now: at("2026-12-01T00:00:00Z"),
    }),
    false,
  );
  const unknown = projectWorkSchedule({
    projectDetails: { dates_not_confirmed: true, end_date: "2020-01-02" },
  });
  assert.equal(unknown.datesUnknown, true);
  assert.equal(
    unconfirmedWorkHasPassed({
      status: "availability",
      bookingDates: [],
      schedule: unknown,
      timeZone: utc,
      now: at("2026-12-01T00:00:00Z"),
    }),
    false,
  );
  const ongoing = projectWorkSchedule({ projectStart: "2026-01-01", projectEnd: null });
  assert.equal(ongoing.isOngoing, true);
});

test("project schedule is used when the booking has no dates", () => {
  const schedule = projectWorkSchedule({
    projectDetails: {
      schedule_categories: [{
        selected_days_yyyymmdd: ["2026-10-20", "2026-10-21"],
        end_time_by_day: { "2026-10-21": "18:00:00" },
      }],
    },
    projectStart: "2026-01-01",
    projectEnd: "2026-01-02",
  });
  const during = booking({ date_ranges: [], projectSchedule: schedule });
  assert.equal(bookingPlacement(during, Date.parse("2026-10-21T17:00:00Z")), "in-progress");
  assert.equal(bookingPlacement(during, Date.parse("2026-10-21T18:00:00Z")), "past");
});

test("the final workday uses the booking timezone", () => {
  const dates = [{ date: "2026-10-22", end_time: "18:00" }];
  const stillWorking = finalWorkInstant(dates, "America/Los_Angeles");
  assert.ok(stillWorking);
  assert.equal(stillWorking!.toISOString(), "2026-10-23T01:00:00.000Z");
  assert.equal(
    unconfirmedWorkHasPassed({
      status: "offer",
      bookingDates: dates,
      timeZone: "America/Los_Angeles",
      now: at("2026-10-23T00:30:00Z"),
    }),
    false,
  );
  assert.equal(
    unconfirmedWorkHasPassed({
      status: "offer",
      bookingDates: dates,
      timeZone: "America/Los_Angeles",
      now: at("2026-10-23T01:00:00Z"),
    }),
    true,
  );
});

test("confirmed participation and protected payments keep their own labels", () => {
  const confirmed = booking({
    status: "confirmed",
    confirmed_at: "2026-10-01T00:00:00Z",
    date_ranges: [{ date: "2026-10-01" }],
  });
  assert.equal(bookingPlacement(confirmed, Date.parse("2026-10-22T00:00:00Z")), "confirmed");
  assert.equal(
    inboxBookingLabel(
      confirmed,
      { status: "offered", expires_at: null },
      Date.parse("2026-10-22T00:00:00Z"),
    ),
    "Awaiting talent",
  );
  const expiredWindow = booking({ date_ranges: [{ date: "2026-11-02" }] });
  assert.equal(
    inboxBookingLabel(
      expiredWindow,
      { status: "payment_pending", expires_at: "2026-10-08T00:00:00Z", payment_state: "requires_payment" },
      Date.parse("2026-10-09T00:00:00Z"),
    ),
    "Contract expired",
  );
  assert.equal(bookingPlacement(expiredWindow, Date.parse("2026-10-09T00:00:00Z")), "in-progress");
  assert.equal(
    bookingFacingLabel({
      status: "confirmed",
      confirmedAt: "2026-10-01T00:00:00Z",
      bookingDates: [{ date: "2026-11-02" }],
      timeZone: utc,
      memo: { status: "payment_pending", expires_at: "2026-10-08T00:00:00Z" },
      now: at("2026-10-09T00:00:00Z"),
    }),
    "Confirmed",
  );
});

test("processing and successful payments are not expired at the deadline", () => {
  const boundary = Date.parse("2026-10-08T00:00:00Z");
  assert.equal(
    isMemoExpired({ status: "payment_pending", expires_at: "2026-10-08T00:00:00Z", payment_state: "processing" }, boundary),
    false,
  );
  assert.equal(
    isMemoExpired({ status: "payment_pending", expires_at: "2026-10-08T00:00:00Z", payment_state: "succeeded" }, boundary),
    false,
  );
  assert.equal(
    isMemoExpired({ status: "payment_pending", expires_at: "2026-10-08T00:00:00Z", payment_state: "requires_payment" }, boundary),
    true,
  );
  assert.equal(
    memoSegment(
      { status: "payment_pending", expires_at: "2026-10-01T00:00:00Z", payment_state: "processing" },
      Date.parse("2026-10-12T00:00:00Z"),
    ),
    "confirmed",
  );
  assert.equal(
    memoSegment(
      { status: "payment_pending", expires_at: "2026-10-01T00:00:00Z" },
      Date.parse("2026-10-12T00:00:00Z"),
    ),
    "past",
  );
});

test("declined and cancelled contracts stay distinct from an open offer", () => {
  assert.equal(
    bookingFacingLabel({
      status: "offer",
      bookingDates: [{ date: "2026-11-02" }],
      timeZone: utc,
      memo: { status: "declined", expires_at: null },
      now: at("2026-10-01T00:00:00Z"),
    }),
    "Declined",
  );
  assert.equal(
    bookingFacingLabel({
      status: "cancelled",
      bookingDates: [{ date: "2026-10-01" }],
      timeZone: utc,
      memo: { status: "cancelled", expires_at: null },
      now: at("2026-10-22T00:00:00Z"),
    }),
    "Canceled",
  );
});
