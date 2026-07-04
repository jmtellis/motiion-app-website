"use server";

import { revalidatePath } from "next/cache";

import { trackServerEvent } from "@/lib/analytics/track-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type RosterSummary = {
  id: string;
  name: string;
  kind: string;
  talentCount: number;
  createdAt: string;
};

export async function listRosters(): Promise<{ rosters: RosterSummary[]; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { rosters: [], error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rosters: [], error: "Not signed in" };

  const { data, error } = await supabase
    .from("talent_lists")
    .select("id, name, kind, created_at, talent_list_members(count)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { rosters: [], error: error.message };

  const rosters: RosterSummary[] = (data ?? []).map((row) => {
    const members = row.talent_list_members as { count?: number }[] | { count?: number } | null;
    const count = Array.isArray(members) ? Number(members[0]?.count ?? 0) : Number(members?.count ?? 0);
    return {
      id: row.id,
      name: row.name,
      kind: row.kind,
      talentCount: count,
      createdAt: row.created_at,
    };
  });

  return { rosters, error: null };
}

export async function createRoster(name: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required" };

  const { data, error } = await supabase
    .from("talent_lists")
    .insert({ owner_id: user.id, name: trimmed, kind: "roster" })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/library");
  return { ok: true, id: data.id };
}

export async function addTalentToRoster(
  listId: string,
  profileId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { error } = await supabase.from("talent_list_members").upsert(
    { list_id: listId, profile_id: profileId },
    { onConflict: "list_id,profile_id", ignoreDuplicates: true },
  );

  if (error) return { ok: false, error: error.message };

  await trackServerEvent("talent_saved_to_list", { list_id: listId, profile_id: profileId });
  revalidatePath("/library");
  return { ok: true };
}

export async function removeTalentFromRoster(
  listId: string,
  profileId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { error } = await supabase
    .from("talent_list_members")
    .delete()
    .eq("list_id", listId)
    .eq("profile_id", profileId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/library");
  return { ok: true };
}
