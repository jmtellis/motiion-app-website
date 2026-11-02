"use server";
import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export async function reviewIndustryApplication(userId: string, version: number, decision: string, feedback: string) {
  await requirePlatformAdmin();
  const db = await createServerSupabaseClient();
  if (!db) return { ok: false, error: "Review is unavailable. Try again." };
  const { error } = await db.rpc("review_industry_application", { p_user_id: userId, p_version: version, p_decision: decision, p_feedback: feedback });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/industry-applications");
  revalidatePath("/admin/analytics");
  return { ok: true };
}
