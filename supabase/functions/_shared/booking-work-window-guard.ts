import { BookingError } from "./booking-deal-memo-store.ts";
import {
  projectWorkSchedule,
  unconfirmedWorkHasPassed,
  type WorkDateRange,
} from "./booking-lifecycle.ts";
import { supabaseAdmin } from "./supabase-admin.ts";

const CLOSED = new Set(["unavailable", "released", "declined", "cancelled", "removed", "expired"]);

type LinkedBooking = {
  id: string;
  project_id: string;
  status: string;
  date_ranges: WorkDateRange[] | null;
  timezone: string | null;
  confirmed_at: string | null;
};

export async function assertUnconfirmedWorkStillOpen(memo: {
  id: string;
  booking_id: string | null;
  availability_check_request_id: string;
  project_id: string | null;
}): Promise<void> {
  const booking = await linkedBooking(memo);
  if (!booking) return;
  if (booking.confirmed_at || booking.status === "confirmed" || booking.status === "completed" || CLOSED.has(booking.status)) {
    return;
  }
  const schedule = hasDates(booking.date_ranges) ? null : await scheduleFor(booking.project_id);
  if (
    unconfirmedWorkHasPassed({
      status: booking.status,
      confirmedAt: booking.confirmed_at,
      bookingDates: booking.date_ranges,
      schedule,
      timeZone: booking.timezone,
      now: new Date(),
    })
  ) {
    throw new BookingError(
      "WORK_DATES_PASSED",
      "These work dates passed before participation was confirmed.",
    );
  }
}

async function linkedBooking(memo: {
  id: string;
  booking_id: string | null;
  availability_check_request_id: string;
}): Promise<LinkedBooking | null> {
  const columns = "id, project_id, status, date_ranges, timezone, confirmed_at";
  if (memo.booking_id) {
    return one(columns, "id", memo.booking_id);
  }
  const byMemo = await one(columns, "deal_memo_id", memo.id);
  if (byMemo) return byMemo;
  return one(columns, "availability_check_request_id", memo.availability_check_request_id);
}

async function one(columns: string, field: string, value: string): Promise<LinkedBooking | null> {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select(columns)
    .eq(field, value)
    .limit(1)
    .maybeSingle();
  if (error) throw new BookingError("NOT_FOUND", "The booking could not be verified.");
  return (data as LinkedBooking | null) ?? null;
}

async function scheduleFor(projectId: string) {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("start_date, end_date, project_details, casting_configuration")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw new BookingError("NOT_FOUND", "The booking could not be verified.");
  if (!data) return null;
  return projectWorkSchedule({
    projectDetails: data.project_details as Record<string, unknown> | null,
    projectStart: data.start_date,
    projectEnd: data.end_date,
    castingConfiguration: data.casting_configuration as Record<string, unknown> | null,
  });
}

function hasDates(dates: WorkDateRange[] | null): boolean {
  return Boolean(dates?.some((range) => /^\d{4}-\d{2}-\d{2}$/.test(range.date?.trim?.() ?? "")));
}
