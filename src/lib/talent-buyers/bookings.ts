"use server";
import { requireHiringAccount } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchProjectRecord } from "./projects";
import { bookingSchema, type Booking } from "./booking-schema";
import { revalidatePath } from "next/cache";
export async function listProjectBookings(projectId: string): Promise<{ bookings: Booking[]; error: string | null }> {
  const profile = await requireHiringAccount();
  if (!await fetchProjectRecord(projectId, profile.id)) return { bookings: [], error: "Project not found." };
  const db = await createServerSupabaseClient();
  if (!db) return { bookings: [], error: "Connection unavailable." };
  const { data, error } = await db.from("project_bookings").select("*").eq("project_id",projectId).order("created_at");
  return { bookings: (data ?? []) as Booking[], error: error ? "Booking storage is not available yet. Please try again after setup is complete." : null };
}
export async function saveBooking(input: unknown): Promise<{ booking?: Booking; error?: string }> {
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the booking details." };
  const profile = await requireHiringAccount();
  const value = parsed.data;
  if (!await fetchProjectRecord(value.project_id,profile.id)) return { error: "Project not found." };
  const db = await createServerSupabaseClient();
  if (!db) return { error: "Connection unavailable." };
  const { id, ...fields } = value;
  const payload = { ...fields, updated_at: new Date().toISOString() };
  const result = id
    ? await db.from("project_bookings").update(payload).eq("id",id).eq("project_id",value.project_id).select("*").single()
    : await db.from("project_bookings").insert(payload).select("*").single();
  if (result.error) return { error: "Could not save this booking. Your changes are still here; please try again." };
  revalidatePath(`/projects/${value.project_id}/bookings`);
  return { booking: result.data as Booking };
}
