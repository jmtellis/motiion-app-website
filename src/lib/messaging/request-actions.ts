import { validCalendarDate } from "@/lib/app/calendar-events";
import type { HomePendingRequest } from "@/types/app";

export type AvailabilityResponse = "available" | "available_with_conflict" | "unavailable";

export function pendingRequestKey(request: Pick<HomePendingRequest, "id" | "request_kind" | "sort_key">) {
  return `${request.request_kind}:${request.id}:${request.sort_key}`;
}

export function pendingRequestActions(kind: string) {
  if (kind === "casting") return { primary: "View casting", negative: "Decline", review: false, view: true };
  if (["session_join_requester", "class_guest_requester"].includes(kind)) return { primary: "View", negative: "Cancel request", review: false, view: true };
  if (kind === "availability_check") return { primary: "Respond", negative: "Not available", review: true, view: false };
  if (kind === "booking_confirmation") return { primary: "Review & confirm", negative: "Decline", review: true, view: false };
  if (kind === "size_sheet") return { primary: "Review & send sizes", negative: "Decline", review: true, view: false };
  if (["session_join_organizer", "class_guest_organizer"].includes(kind)) return { primary: "Approve", negative: "Decline", review: false, view: false };
  return { primary: "Accept", negative: "Decline", review: false, view: false };
}


export function requestScheduleLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const lines = new Map<string, string>();
  for (const range of value) {
    if (!range || typeof range !== "object" || !validCalendarDate(range.date)) continue;
    const date = new Date(`${range.date}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" });
    const validTime = (time: unknown): time is string => typeof time === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time);
    const start = validTime(range.start_time) ? range.start_time.slice(0,5) : null;
    const end = validTime(range.end_time) ? range.end_time.slice(0,5) : null;
    const key = `${range.date}:${start}:${end}`;
    lines.set(key, `${date} · ${start ? `${start}${end ? `–${end}${end < start ? " (+1 day)" : ""}` : ""}` : "All day"}`);
  }
  return [...lines.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([,line]) => line);
}
