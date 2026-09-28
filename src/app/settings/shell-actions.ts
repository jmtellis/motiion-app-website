"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { BUYER_HOME_PATH } from "@/lib/talent-buyers/dashboard-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function switchProfileShell(shell: "talent" | "lookingForTalent") {
  if (shell !== "talent" && shell !== "lookingForTalent") {
    return { ok: false as const, error: "Choose a workspace to open." };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false as const, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "You must be signed in." };

  const { error } = await supabase.rpc("set_active_shell", { p_shell: shell });
  if (error) {
    return { ok: false as const, error: "That workspace is not available on this account." };
  }

  revalidatePath("/", "layout");
  redirect(shell === "lookingForTalent" ? BUYER_HOME_PATH : "/home");
}
