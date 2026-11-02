import { z } from "zod";

export type ConfirmationDate = { date: string; start_time?: string; end_time?: string };
export type ProjectConfirmation = {
  id: string; projectId: string; talentName: string; role: string; status: string;
  dates: ConfirmationDate[]; timeZone: string | null; availabilityRequestId: string | null;
  availabilityStatus: string | null; availabilityResponse: string | null; responseNote: string | null;
  confirmationStatus: string | null; hasLegacyAgreement: boolean;
};
export type ConfirmationRole = { id: string; title: string; selectedIds: string[]; movedIds: string[] };
export type ConfirmationData = { records: ProjectConfirmation[]; roles: ConfirmationRole[]; error: string | null };
export const confirmationDateInput = z.object({
  startDate: z.string().date(), endDate: z.string().date(),
  timeZone: z.string().refine((value) => { try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return true; } catch { return false; } }, "Choose a valid time zone."),
  message: z.string().trim().max(2000).default(""),
}).refine((value) => value.endDate >= value.startDate, { message: "End date must follow the start date.", path: ["endDate"] })
.refine((value) => (Date.parse(value.endDate) - Date.parse(value.startDate)) / 86400000 < 366, { message: "Choose no more than one year of dates.", path: ["endDate"] });
export function confirmationDateRanges(start: string, end: string): ConfirmationDate[] {
  const parsed = confirmationDateInput.parse({ startDate: start, endDate: end, timeZone: "UTC" });
  const result: ConfirmationDate[] = [];
  for (let day = Date.parse(parsed.startDate); day <= Date.parse(parsed.endDate); day += 86400000) result.push({ date: new Date(day).toISOString().slice(0, 10) });
  return result;
}
export function confirmationLabel(record: ProjectConfirmation): string {
  if (record.status === "confirmed") return "Confirmed";
  if (record.confirmationStatus === "pending") return "Confirmation requested";
  if (record.status === "on_hold") return "On hold";
  if (record.status === "availability") {
    if (record.availabilityResponse === "available") return "Available";
    if (record.availabilityResponse === "available_with_conflict") return "Available with conflict";
    if (record.availabilityResponse === "unavailable") return "Unavailable";
    return record.availabilityRequestId ? "Availability requested" : "Ready to coordinate";
  }
  const labels: Record<string, string> = { completed: "Completed", cancelled: "Cancelled", declined: "Declined", unavailable: "Unavailable", released: "Released", removed: "Removed", expired: "Expired", offer: "Legacy agreement", contract: "Legacy agreement" };
  return labels[record.status] ?? "Previous engagement";
}
export function confirmationCanAct(record: ProjectConfirmation) {
  return !record.hasLegacyAgreement && ["availability", "on_hold"].includes(record.status);
}
export function handoffIsCurrent(role: ConfirmationRole) {
  return role.selectedIds.length > 0 && [...role.selectedIds].sort().join(",") === [...role.movedIds].sort().join(",");
}

const PAST_CONFIRMATION_STATUSES = new Set(["completed", "cancelled", "declined", "removed", "expired", "released", "unavailable"]);
export function confirmationScope(record: Pick<ProjectConfirmation, "status" | "availabilityResponse">): "active" | "past" {
  return PAST_CONFIRMATION_STATUSES.has(record.status) || record.availabilityResponse === "unavailable" ? "past" : "active";
}
