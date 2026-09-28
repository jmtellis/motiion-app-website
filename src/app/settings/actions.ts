"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

/** The database deletes only auth.uid(); no user ID or admin credential is accepted. */
export async function deleteTalentAccount(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Account deletion is temporarily unavailable." };

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false, error: "You must be signed in to delete your account." };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("user_id", user.id)
    .maybeSingle<{ account_type: string | null }>();

  if (profileError) return { ok: false, error: "We couldn’t verify your account. Please try again." };
  if (!profile || !["talent", "community"].includes(profile.account_type ?? "")) {
    return { ok: false, error: "Use your account’s settings page to delete your account." };
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { ok: false, error: "We couldn’t delete your account. Please try again." };

  await supabase.auth.signOut();
  return { ok: true };
}
