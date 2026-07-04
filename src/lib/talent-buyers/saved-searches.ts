"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TalentNavigatorFilters } from "@/lib/talent-navigator/types";

export type SavedSearchRow = {
  id: string;
  label: string;
  filters: TalentNavigatorFilters;
  createdAt: string;
};

export async function listSavedSearches(): Promise<{ searches: SavedSearchRow[]; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { searches: [], error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { searches: [], error: "Not signed in" };

  const { data, error } = await supabase
    .from("saved_searches")
    .select("id, label, filters, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { searches: [], error: error.message };

  return {
    searches: (data ?? []).map((row) => ({
      id: row.id,
      label: row.label,
      filters: row.filters as TalentNavigatorFilters,
      createdAt: row.created_at,
    })),
    error: null,
  };
}

export async function saveSearch(
  label: string,
  filters: TalentNavigatorFilters,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const trimmed = label.trim();
  if (!trimmed) return { ok: false, error: "Label is required" };

  const { data, error } = await supabase
    .from("saved_searches")
    .insert({ owner_id: user.id, label: trimmed, filters })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/talent");
  return { ok: true, id: data.id };
}
