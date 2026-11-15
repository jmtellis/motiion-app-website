import { createServerSupabaseClient } from "@/lib/supabase/server";
/** Fail closed, independent of billing and user-editable account/shell metadata. */
export async function requireIndustryApproval(userId: string, projectId?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await createServerSupabaseClient();
  if (!db) return { ok: false, error: "Could not check industry access. Please try again." };
  const { data: { user } } = await db.auth.getUser();
  if (!user || user.id !== userId) return { ok: false, error: "Sign in again to continue." };
  if (projectId) {
    const role = await db.rpc("is_project_operator", { p_project_id: projectId, p_user_id: userId });
    if (!role.error && role.data === true) return { ok: true };
  }
  const { data, error } = await db.rpc("has_industry_approval");
  return !error && data === true ? { ok: true } : { ok: false, error: "Your industry application must be approved before using professional features." };
}
