import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProjectConfirmation } from "@/lib/talent-buyers/confirmation-model";
export type TalentConfirmation = ProjectConfirmation & { projectTitle: string };
export type TalentConfirmationData = { records: TalentConfirmation[]; error: string | null };
export async function fetchTalentConfirmations(): Promise<TalentConfirmationData> {
  const db = await createServerSupabaseClient();
  if (!db) return { records: [], error: "Connection unavailable." };
  const { data, error } = await db.rpc("list_talent_bookings", { p_bucket: "all" });
  if (error) return { records: [], error: "Could not load confirmations. Please try again." };
  const rows = (data ?? []) as Record<string, unknown>[];
  if (!rows.length) return { records: [], error: null };
  const [projects, availability, requests] = await Promise.all([
    db.from("projects").select("id,title").in("id", [...new Set(rows.map((row) => String(row.project_id)))]),
    db.from("availability_check_requests").select("id,status,response_kind,response_note").in("id", rows.flatMap((row) => row.availability_check_request_id ? [String(row.availability_check_request_id)] : [])),
    db.from("booking_confirmation_requests").select("booking_id,status,updated_at").in("booking_id", rows.map((row) => String(row.id))).order("updated_at", { ascending: false }),
  ]);
  if (projects.error || availability.error || requests.error) return { records: [], error: "Some confirmation details could not be loaded. Please try again." };
  return { error: null, records: rows.map((row) => {
    const request = availability.data?.find((item) => item.id === row.availability_check_request_id);
    return { id: String(row.id), projectId: String(row.project_id), projectTitle: projects.data?.find((item) => item.id === row.project_id)?.title || "Project", talentName: "You", role: String(row.work_title || "Project team"), status: String(row.status), dates: Array.isArray(row.date_ranges) ? row.date_ranges as ProjectConfirmation["dates"] : [], timeZone: typeof row.timezone === "string" ? row.timezone : null, availabilityRequestId: typeof row.availability_check_request_id === "string" ? row.availability_check_request_id : null, availabilityStatus: request?.status ?? null, availabilityResponse: request?.response_kind ?? null, responseNote: request?.response_note ?? null, confirmationStatus: requests.data?.find((item) => item.booking_id === row.id)?.status ?? null, hasLegacyAgreement: Boolean(row.deal_memo_id) || ["offer", "contract"].includes(String(row.status)) };
  }) };
}
