"use server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canCreatePaidProject } from "./project-creation-access";
import type { ProjectAccess } from "./project-catalog";

export async function getProjectCreationAccess(requestId?: string): Promise<{ allowed: boolean; error?: string }> {
  const db = await createServerSupabaseClient();
  if (!db) return { allowed: false, error: "Couldn’t check your plan. Please try again." };
  // A successful insert whose response was lost must remain retryable at full capacity.
  if (requestId && /^[0-9a-f-]{36}$/i.test(requestId)) {
    const { data: { user } } = await db.auth.getUser();
    if (user) {
      const prior = await db.from("projects").select("id").eq("poster_id", user.id)
        .eq("is_composable", true).eq("project_configuration->>create_request_id", requestId).limit(1);
      if (!prior.error && prior.data?.length) return { allowed: true };
    }
  }
  const { data, error } = await db.rpc("account_project_access");
  if (error || !data) return { allowed: false, error: "Couldn’t check your plan. Please try again." };
  return { allowed: canCreatePaidProject(data as ProjectAccess) };
}
