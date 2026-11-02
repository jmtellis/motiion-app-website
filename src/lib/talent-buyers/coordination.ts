"use server";
import { requireHiringAccount } from "@/lib/auth/session";
import { requireIndustryApproval } from "@/lib/talent-buyers/require-industry-approval";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchProjectRecord } from "./projects";
import { COORDINATION_COLUMNS, coordinationSchema, type CoordinationRecord } from "./coordination-schema";
import { revalidatePath } from "next/cache";

export async function listProjectCoordination(projectId: string): Promise<{ records: CoordinationRecord[]; error: string | null }> {
  const profile = await requireHiringAccount();
  if (!await fetchProjectRecord(projectId, profile.id)) return { records: [], error: "Project not found." };
  const db = await createServerSupabaseClient();
  if (!db) return { records: [], error: "Connection unavailable." };
  const { data, error } = await db.from("project_bookings").select(COORDINATION_COLUMNS).eq("project_id", projectId).order("start_date", { ascending: true, nullsFirst: false }).order("created_at");
  return { records: (data ?? []) as CoordinationRecord[], error: error ? "Could not load project coordination. Please try again." : null };
}

export async function saveProjectCoordination(input: unknown): Promise<{ record?: CoordinationRecord; error?: string }> {
  // Only supported fields are accepted. Never overwrite historical fee/contact/contract data.
  const parsed = coordinationSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  const profile = await requireHiringAccount();
  const approval = await requireIndustryApproval(profile.id);
  if (!approval.ok) return { error: approval.error };
  const value = parsed.data;
  if (!await fetchProjectRecord(value.project_id, profile.id)) return { error: "Project not found." };
  const db = await createServerSupabaseClient();
  if (!db) return { error: "Connection unavailable." };
  const { id, ...fields } = value;
  const payload = { ...fields, updated_at: new Date().toISOString() };
  const result = id
    ? await db.from("project_bookings").update(payload).eq("id", id).eq("project_id", value.project_id).select(COORDINATION_COLUMNS).single()
    : await db.from("project_bookings").insert(payload).select(COORDINATION_COLUMNS).single();
  if (result.error) return { error: "Could not save. Your changes are still here; please try again." };
  revalidatePath(`/projects/${value.project_id}/coordination`);
  revalidatePath(`/projects/${value.project_id}`);
  revalidatePath("/projects");
  return { record: result.data as CoordinationRecord };
}
