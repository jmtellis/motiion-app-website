import { createServerSupabaseClient } from "@/lib/supabase/server";

import { projectWorkSchedule } from "./booking-lifecycle";
import type { InboxBooking } from "./booking-inbox-rules";
export async function loadTalentBookingInbox() {
  const db = await createServerSupabaseClient();
  if (!db) return { bookings: [] as InboxBooking[], error: true };
  const { data, error } = await db.rpc("list_talent_bookings", {
    p_bucket: "all",
  });
  const bookings = (Array.isArray(data) ? data : []) as InboxBooking[];
  const projectIds = [
    ...new Set(bookings.map((row) => row.project_id).filter(Boolean)),
  ];
  const { data: projects } = projectIds.length
    ? await db
        .from("projects")
        .select("id, title, start_date, end_date, project_details, casting_configuration")
        .in("id", projectIds)
    : { data: [] };
  const projectTitles = new Map(
    (projects ?? []).map((row) => [row.id, row.title]),
  );
  const projectSchedules = new Map(
    (projects ?? []).map((row) => [
      row.id,
      projectWorkSchedule({
        projectDetails: row.project_details as Record<string, unknown> | null,
        projectStart: row.start_date,
        projectEnd: row.end_date,
        castingConfiguration: row.casting_configuration as Record<string, unknown> | null,
      }),
    ]),
  );
  const ids = bookings.flatMap((row) =>
    row.availability_check_request_id
      ? [row.availability_check_request_id]
      : [],
  );
  const { data: availability } = ids.length
    ? await db
        .from("availability_check_requests")
        .select("id,status,response_kind,expires_at")
        .in("id", ids)
    : { data: [] };
  const byId = new Map((availability ?? []).map((row) => [row.id, row]));
  return {
    error: Boolean(error),
    bookings: bookings.map((row) => {
      const request = byId.get(row.availability_check_request_id);
      row = {
        ...row,
        projectTitle: projectTitles.get(row.project_id) ?? null,
        projectSchedule: projectSchedules.get(row.project_id) ?? null,
      };
      const unavailable =
        request?.response_kind === "unavailable" ||
        request?.status === "declined";
      return unavailable && row.status === "availability"
        ? { ...row, status: "unavailable" }
        : row;
    }),
  };
}
