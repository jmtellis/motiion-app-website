"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireHiringAccount } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireIndustryApproval } from "./require-industry-approval";
import { confirmationDateInput, confirmationDateRanges, type ConfirmationData, type ProjectConfirmation } from "./confirmation-model";

async function context(projectId: string) {
  if (!z.string().uuid().safeParse(projectId).success) throw new Error("Project not found.");
  const profile = await requireHiringAccount();
  const approval = await requireIndustryApproval(profile.id);
  if (!approval.ok) throw new Error(approval.error);
  const db = await createServerSupabaseClient();
  if (!db) throw new Error("Connection unavailable.");
  const operator = await db.rpc("is_project_operator", { p_project_id: projectId, p_user_id: profile.id });
  if (operator.error || !operator.data) throw new Error("Only the project owner or an approved project admin can manage confirmations.");
  return db;
}
function refresh(projectId: string) {
  for (const path of [`/projects/${projectId}`, `/projects/${projectId}/coordination`, `/projects/${projectId}/workspace/cast`, "/projects", "/messages", "/inbox", "/events", "/schedule", "/home", "/opportunities"]) revalidatePath(path);
}
function failure(error: { message?: string; code?: string } | unknown): string {
  const token = error && typeof error === "object" && "message" in error ? String(error.message) : "";
  const messages: Record<string, string> = {
    booking_work_dates_passed: "These dates have passed. Reschedule or close this coordination before asking for confirmation.",
    booking_resolution_agreement_requires_review: "This historical record has an agreement or payment. Contact support before changing it.",
    booking_resolution_dates_must_be_future: "Choose future dates when rescheduling.",
    booking_confirmation_invalid_status: "This person’s status changed. Refresh before trying again.",
    booking_forbidden: "You no longer have permission to manage this project.",
  };
  for (const [code, message] of Object.entries(messages)) if (token.includes(code)) return message;
  if (error && typeof error === "object" && "code" in error && error.code === "PGRST202") return "This server is missing the confirmations update. Please contact support.";
  return "Could not save this action. Refresh the current status and try again.";
}
export async function listProjectConfirmations(projectId: string): Promise<ConfirmationData> {
  try {
    const db = await context(projectId);
    const [bookings, roles] = await Promise.all([
      db.rpc("list_project_bookings_domain", { p_project_id: projectId, p_status: null }),
      db.from("roles").select("id,title,final_select_ids,confirmation_handoff_ids").eq("project_id", projectId).order("created_at"),
    ]);
    if (bookings.error || roles.error) throw bookings.error ?? roles.error;
    const rows = (bookings.data ?? []) as Record<string, unknown>[];
    const userIds = [...new Set(rows.map((row) => String(row.talent_user_id)))];
    const requestIds = rows.flatMap((row) => typeof row.availability_check_request_id === "string" ? [row.availability_check_request_id] : []);
    const [profiles, availability, confirmations] = await Promise.all([
      userIds.length ? db.from("profiles").select("user_id,display_name,first_name,last_name").in("user_id", userIds) : Promise.resolve({ data: [], error: null }),
      requestIds.length ? db.from("availability_check_requests").select("id,status,response_kind,response_note").in("id", requestIds) : Promise.resolve({ data: [], error: null }),
      rows.length ? db.from("booking_confirmation_requests").select("booking_id,status,updated_at").in("booking_id", rows.map((row) => String(row.id))).order("updated_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    ]);
    if (profiles.error || availability.error || confirmations.error) throw profiles.error ?? availability.error ?? confirmations.error;
    const records: ProjectConfirmation[] = rows.map((row) => {
      const person = profiles.data?.find((person) => person.user_id === row.talent_user_id);
      const request = availability.data?.find((request) => request.id === row.availability_check_request_id);
      const confirmation = confirmations.data?.find((request) => request.booking_id === row.id);
      return { id: String(row.id), projectId, talentName: person?.display_name || [person?.first_name, person?.last_name].filter(Boolean).join(" ") || "Talent", role: String(row.work_title || "Project team"), status: String(row.status), dates: Array.isArray(row.date_ranges) ? row.date_ranges as ProjectConfirmation["dates"] : [], timeZone: typeof row.timezone === "string" ? row.timezone : null, availabilityRequestId: typeof row.availability_check_request_id === "string" ? row.availability_check_request_id : null, availabilityStatus: request?.status ?? null, availabilityResponse: request?.response_kind ?? null, responseNote: request?.response_note ?? null, confirmationStatus: confirmation?.status ?? null, hasLegacyAgreement: Boolean(row.deal_memo_id) || ["offer", "contract"].includes(String(row.status)) };
    });
    return { records, roles: (roles.data ?? []).filter((role) => role.final_select_ids?.length).map((role) => ({ id: role.id as string, title: role.title as string || "Role", selectedIds: role.final_select_ids as string[], movedIds: (role.confirmation_handoff_ids as string[] | null) ?? [] })), error: null };
  } catch (error) { return { records: [], roles: [], error: failure(error) }; }
}
export async function moveCastingSelectionsToConfirmations(input: { projectId: string; roleId: string; expectedIds: string[] }) {
  try {
    const parsed = z.object({ projectId: z.string().uuid(), roleId: z.string().uuid(), expectedIds: z.array(z.string().uuid()).min(1).max(1000) }).parse(input);
    const db = await context(parsed.projectId);
    const role = await db.from("roles").select("id").eq("id", parsed.roleId).eq("project_id", parsed.projectId).maybeSingle();
    if (role.error || !role.data) return { error: "Role not found in this project." };
    const result = await db.rpc("move_casting_final_selects_to_confirmations", { p_role_id: parsed.roleId, p_expected_ids: parsed.expectedIds });
    if (result.error) return { error: failure(result.error) };
    refresh(parsed.projectId);
    const data = result.data as { added_count: number; external_count: number };
    return { added: data.added_count, external: data.external_count };
  } catch (error) { return { error: failure(error) }; }
}
export async function updateProjectConfirmation(input: { projectId: string; id: string; action: "availability" | "confirm" | "hold" | "release" | "close" | "reschedule"; requestId?: string; dates?: unknown }) {
  try {
    const parsed = z.object({ projectId: z.string().uuid(), id: z.string().uuid(), action: z.enum(["availability", "confirm", "hold", "release", "close", "reschedule"]), requestId: z.string().uuid().optional(), dates: z.unknown().optional() }).parse(input);
    const db = await context(parsed.projectId);
    const record = await db.from("bookings").select("id,deal_memo_id,status").eq("id", parsed.id).eq("project_id", parsed.projectId).maybeSingle();
    if (record.error || !record.data) return { error: "This confirmation is no longer available." };
    if (record.data.deal_memo_id || ["offer", "contract"].includes(record.data.status)) return { error: "This historical record has an agreement. Contact support before changing it." };
    let result;
    if (parsed.action === "availability" || parsed.action === "reschedule") {
      const dates = confirmationDateInput.safeParse(parsed.dates);
      if (!dates.success) return { error: dates.error.issues[0]?.message ?? "Check the dates." };
      const ranges = confirmationDateRanges(dates.data.startDate, dates.data.endDate);
      if (parsed.action === "reschedule" && !parsed.requestId) return { error: "Reopen this editor and try again." };
      result = parsed.action === "availability"
        ? await db.rpc("booking_request_availability", { p_booking_id: parsed.id, p_date_ranges: ranges, p_timezone: dates.data.timeZone, p_message: dates.data.message, p_title: null })
        : await db.rpc("booking_resolve_unconfirmed", { p_booking_id: parsed.id, p_action: "reschedule", p_date_ranges: ranges, p_timezone: dates.data.timeZone, p_resolution_id: parsed.requestId });
    } else if (parsed.action === "close") {
      if (!parsed.requestId) return { error: "Reopen this editor and try again." };
      result = await db.rpc("booking_resolve_unconfirmed", { p_booking_id: parsed.id, p_action: "close", p_date_ranges: [], p_timezone: null, p_resolution_id: parsed.requestId });
    } else {
      const commands = { confirm: "booking_request_confirmation", hold: "booking_place_hold", release: "booking_release_hold" } as const;
      result = await db.rpc(commands[parsed.action], { p_booking_id: parsed.id });
    }
    if (result.error) return { error: failure(result.error) };
    refresh(parsed.projectId); return { ok: true };
  } catch (error) { return { error: failure(error) }; }
}
