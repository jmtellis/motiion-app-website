import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeBlockedUserIds } from "./blocked-visibility-model";
/** React cache is per request, never shared across accounts. Anonymous catalogs stay public. */
export const currentBlockedUsers = cache(async (): Promise<{ ids: Set<string>; error: string | null }> => {
  const db = await createServerSupabaseClient();
  if (!db) return { ids: new Set(), error: "Account preferences are unavailable. Please retry." };
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (!user) return { ids: new Set(), error: authError && authError.name !== "AuthSessionMissingError" ? "Your session could not be checked. Please sign in again." : null };
  const { data, error } = await db.rpc("my_blocked_user_ids");
  return { ids: normalizeBlockedUserIds(data), error: error ? "Blocked-user preferences could not be loaded. Please retry." : null };
});
