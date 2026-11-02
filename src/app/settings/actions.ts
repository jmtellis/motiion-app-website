"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkAccountDeletionBilling } from "@/lib/billing/account-deletion";
import type { AccountDeletionResult } from "@/lib/billing/account-deletion-state";
import { normalizeShell } from "@/lib/auth/profile";

/** The database deletes only auth.uid(); no user ID or admin credential is accepted. */
export async function deleteTalentAccount(): Promise<AccountDeletionResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Account deletion is temporarily unavailable." };

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false, error: "You must be signed in to delete your account." };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("account_type, enabled_shells")
    .eq("user_id", user.id)
    .maybeSingle<{ account_type: string | null; enabled_shells: string[] | null }>();

  if (profileError) return { ok: false, error: "We couldn’t verify your account. Please try again." };
  const shells = (profile?.enabled_shells?.length ? profile.enabled_shells : [profile?.account_type]).map(normalizeShell);
  if (!profile || !shells.some(shell => shell === "talent" || shell === "community")) {
    return { ok: false, error: "Use your account’s settings page to delete your account." };
  }

  const billing = await checkAccountDeletionBilling(user.id);
  if (!billing.ok) return billing;
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { ok: false, error: "We couldn’t delete your account. Please try again." };

  await supabase.auth.signOut();
  return { ok: true };
}
