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
  projectId: string | null;
};

export type RosterMember = {
  id: string;
  profileId: string;
  addedAt: string;
  name: string;
  slug: string | null;
  location: string | null;
  avatarUrl: string | null;
  styles: string[];
};

export type RosterDetail = RosterSummary & {
  members: RosterMember[];
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
    .select("id, name, kind, project_id, created_at, talent_list_members(count)")
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
      projectId: (row.project_id as string | null) ?? null,
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
  revalidatePath(`/library/${listId}`);
  return { ok: true };
}

export async function getRosterWithMembers(
  rosterId: string,
): Promise<{ roster: RosterDetail | null; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { roster: null, error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { roster: null, error: "Not signed in" };

  const { data: list, error: listError } = await supabase
    .from("talent_lists")
    .select("id, name, kind, project_id, created_at")
    .eq("id", rosterId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (listError) return { roster: null, error: listError.message };
  if (!list) return { roster: null, error: "Roster not found" };

  const { data: members, error: membersError } = await supabase
    .from("talent_list_members")
    .select(
      "id, profile_id, added_at, professional_profiles(id, slug, full_name, location_city, location_region, styles, media_assets(url, kind, position))",
    )
    .eq("list_id", rosterId)
    .order("added_at", { ascending: false });

  if (membersError) return { roster: null, error: membersError.message };

  const mappedMembers: RosterMember[] = (members ?? []).map((row) => {
    const profile = row.professional_profiles as {
      id?: string;
      slug?: string | null;
      full_name?: string | null;
      location_city?: string | null;
      location_region?: string | null;
      styles?: string[] | null;
      media_assets?: { url?: string; kind?: string; position?: number }[] | null;
    } | null;

    const assets = profile?.media_assets ?? [];
    const headshot =
      assets
        .filter((asset) => asset.kind === "headshot")
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.url ??
      assets[0]?.url ??
      null;

    const location = [profile?.location_city, profile?.location_region].filter(Boolean).join(", ");

    return {
      id: row.id as string,
      profileId: row.profile_id as string,
      addedAt: row.added_at as string,
      name: profile?.full_name?.trim() || "Talent",
      slug: profile?.slug ?? null,
      location: location || null,
      avatarUrl: headshot,
      styles: Array.isArray(profile?.styles) ? profile!.styles!.map(String).slice(0, 3) : [],
    };
  });

  return {
    roster: {
      id: list.id,
      name: list.name,
      kind: list.kind,
      createdAt: list.created_at,
      projectId: (list.project_id as string | null) ?? null,
      talentCount: mappedMembers.length,
      members: mappedMembers,
    },
    error: null,
  };
}

export async function renameRoster(
  rosterId: string,
  name: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase
    .from("talent_lists")
    .update({ name: trimmed })
    .eq("id", rosterId)
    .eq("owner_id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/library");
  revalidatePath(`/library/${rosterId}`);
  return { ok: true };
}

export async function deleteRoster(rosterId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase
    .from("talent_lists")
    .delete()
    .eq("id", rosterId)
    .eq("owner_id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/library");
  return { ok: true };
}
