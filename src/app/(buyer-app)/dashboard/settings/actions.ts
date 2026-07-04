"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isHiringAccount } from "@/lib/auth/profile";

export type DeleteBuyerAccountResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteBuyerAccount(): Promise<DeleteBuyerAccountResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in to delete your account." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("user_id", user.id)
    .maybeSingle<{ account_type: string | null }>();

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  if (!profile || !isHiringAccount(profile.account_type)) {
    return { ok: false, error: "Only talent buyer accounts can be deleted from this page." };
  }

  const { error: deleteError } = await supabase.rpc("delete_my_account");
  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  await supabase.auth.signOut();

  return { ok: true };
}
