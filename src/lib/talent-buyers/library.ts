"use server";

import { revalidatePath } from "next/cache";
import { readPagedRows } from "@/lib/supabase/read-pages";

import { trackServerEvent } from "@/lib/analytics/track-server";
import { requireIndustryProFeature } from "@/lib/billing/gate";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const SAVED_TALENT_NAME = "Saved Talent";
const MEMBER_ROW_SELECT = "id, profile_id, added_at";

export type LibraryTalent = {
  id: string;
  profileId: string;
  userId?: string | null;
  addedAt: string;
  name: string;
  slug: string | null;
  location: string | null;
  avatarUrl: string | null;
  styles: string[];
  collectionIds: string[];
};

export type LibraryPreviewPerson = {
  name: string;
  avatarUrl: string | null;
};

export type LibraryCollectionSummary = {
  id: string;
  name: string;
  description: string | null;
  talentCount: number;
  createdAt: string;
  updatedAt: string;
  previewAvatars: string[];
  /** First four members, in roster order, including people without a photo. */
  previewPeople: LibraryPreviewPerson[];
};

export type LibraryCollectionDetail = LibraryCollectionSummary & {
  members: LibraryTalent[];
};

type HydratedMemberCard = {
  profile_id: string;
  user_id?: string | null;
  slug: string | null;
  name: string;
  location: string | null;
  avatar_url: string | null;
  styles: string[] | null;
};

/** Database authorization is authoritative; never bypass a failed RPC with admin reads. */
async function hydrateLibraryMembers(
  memberRows: { id: string; profile_id: string; added_at: string }[],
  collectionIdsByProfile: Map<string, string[]> = new Map(),
): Promise<{ talent: LibraryTalent[]; error: string | null }> {
  if (!memberRows.length) return { talent: [], error: null };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { talent: [], error: "Profile data is temporarily unavailable." };
  const profileIds = [...new Set(memberRows.map((row) => row.profile_id))];
  const cardsByProfileId = new Map<string, HydratedMemberCard>();
  for (let index = 0; index < profileIds.length; index += 200) {
    const { data, error } = await supabase.rpc("hydrate_library_member_cards", {
      p_profile_ids: profileIds.slice(index, index + 200),
    });
    if (error || !Array.isArray(data)) return { talent: [], error: "Profiles could not be loaded. Please try again." };
    for (const row of data as HydratedMemberCard[]) cardsByProfileId.set(row.profile_id, row);
  }
  return {
    talent: memberRows.map((row) => {
      const card = cardsByProfileId.get(row.profile_id);
      return {
        id: row.id,
        profileId: row.profile_id,
        userId: card?.user_id ?? null,
        addedAt: row.added_at,
        name: card?.name || "Profile unavailable",
        slug: card?.slug ?? null,
        location: card?.location ?? null,
        avatarUrl: card?.avatar_url ?? null,
        styles: Array.isArray(card?.styles) ? card.styles.map(String).slice(0, 3) : [],
        collectionIds: collectionIdsByProfile.get(row.profile_id) ?? [],
      };
    }),
    error: null,
  };
}
async function requireOwner() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { supabase: null, userId: null, error: "Supabase not configured" as const };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase: null, userId: null, error: "Not signed in" as const };

  return { supabase, userId: user.id, error: null };
}

export async function getOrCreateSavedTalentListId(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  userId: string,
): Promise<{ id: string | null; error?: string }> {
  const find = () => supabase.from("talent_lists").select("id")
    .eq("owner_id", userId).eq("kind", "favorites").maybeSingle<{ id: string }>();
  const existing = await find();
  if (existing.error) return { id: null, error: existing.error.message };
  if (existing.data?.id) return { id: existing.data.id };
  // The display name does not identify favorites: a named roster may use it too.
  const { data: created, error } = await supabase.from("talent_lists")
    .insert({ owner_id: userId, name: SAVED_TALENT_NAME, kind: "favorites" }).select("id").single();
  if (error?.code === "23505") {
    const raced = await find();
    if (raced.data?.id) return { id: raced.data.id };
  }
  if (error || !created) return { id: null, error: error?.message ?? "Could not create Saved Talent" };
  return { id: created.id };
}

function revalidateLibrary(collectionId?: string) {
  revalidatePath("/library");
  if (collectionId) revalidatePath(`/library/${collectionId}`);
}

export async function listCollections(): Promise<{
  collections: LibraryCollectionSummary[];
  error: string | null;
}> {
  const { supabase, userId, error } = await requireOwner();
  if (!supabase || !userId) return { collections: [], error: error ?? "Not signed in" };

  const { data, error: queryError } = await readPagedRows((from, to) => supabase
    .from("talent_lists")
    .select("id, name, description, kind, project_id, created_at, updated_at")
    .eq("owner_id", userId)
    .eq("kind", "roster")
    .is("project_id", null)
    .order("updated_at", { ascending: false }).order("id").range(from, to));

  if (queryError) return { collections: [], error: queryError.message };

  const listIds = (data ?? []).map((row) => row.id as string);
  const membersByList = new Map<string, LibraryTalent[]>();
  const countsByList = new Map<string, number>();

  if (listIds.length) {
    const { data: members, error: membersError } = await readPagedRows((from, to) => supabase
      .from("talent_list_members")
      .select("id, list_id, profile_id, added_at, talent_lists!inner(owner_id, kind, project_id)")
      .eq("talent_lists.owner_id", userId).eq("talent_lists.kind", "roster").is("talent_lists.project_id", null)
      .order("added_at", { ascending: false }).order("id").range(from, to));

    if (membersError) return { collections: [], error: membersError.message };
    const previewRows = (members ?? []).filter((member) => {
      const count = countsByList.get(member.list_id) ?? 0;
      countsByList.set(member.list_id, count + 1);
      return count < 4;
    });
    const hydrated = await hydrateLibraryMembers(
      previewRows.map((member) => ({
        id: member.id as string,
        profile_id: member.profile_id as string,
        added_at: member.added_at as string,
      })),
    );
    if (hydrated.error) return { collections: [], error: hydrated.error };
    const byProfileId = new Map(hydrated.talent.map((member) => [member.profileId, member]));

    for (const member of previewRows) {
      const listId = member.list_id as string;
      const talent = byProfileId.get(member.profile_id as string);
      if (!talent) continue;
      const current = membersByList.get(listId) ?? [];
      current.push(talent);
      membersByList.set(listId, current);
    }
  }

  const collections: LibraryCollectionSummary[] = (data ?? []).map((row) => {
    const members = membersByList.get(row.id as string) ?? [];
    const preview = members.slice(0, 4);
    return {
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string | null) ?? null,
      talentCount: countsByList.get(row.id as string) ?? 0,
      createdAt: row.created_at as string,
      updatedAt: (row.updated_at as string) ?? (row.created_at as string),
      previewPeople: preview.map((member) => ({
        name: member.name,
        avatarUrl: member.avatarUrl,
      })),
      previewAvatars: preview
        .map((member) => member.avatarUrl)
        .filter((url): url is string => Boolean(url)),
    };
  });

  return { collections, error: null };
}

export async function getCollection(
  collectionId: string,
): Promise<{ collection: LibraryCollectionDetail | null; error: string | null }> {
  const { supabase, userId, error } = await requireOwner();
  if (!supabase || !userId) return { collection: null, error: error ?? "Not signed in" };

  const { data: list, error: listError } = await supabase
    .from("talent_lists")
    .select("id, name, description, kind, project_id, created_at, updated_at")
    .eq("id", collectionId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (listError) return { collection: null, error: listError.message };
  if (!list) return { collection: null, error: "Collection not found" };
  if (list.kind === "favorites") return { collection: null, error: "favorites" };
  if (list.kind !== "roster" || list.project_id) {
    return { collection: null, error: "Collection not found" };
  }

  const { data: members, error: membersError } = await readPagedRows((from, to) => supabase
    .from("talent_list_members")
    .select(MEMBER_ROW_SELECT)
    .eq("list_id", collectionId)
    .order("added_at", { ascending: false }).order("id").range(from, to));

  if (membersError) return { collection: null, error: membersError.message };

  const hydrated = await hydrateLibraryMembers(
    (members ?? []).map((row) => ({
      id: row.id as string,
      profile_id: row.profile_id as string,
      added_at: row.added_at as string,
    })),
    new Map((members ?? []).map((row) => [row.profile_id as string, [collectionId]])),
  );
  if (hydrated.error) return { collection: null, error: hydrated.error };
  const mapped = hydrated.talent;
  const preview = mapped.slice(0, 4);

  return {
    collection: {
      id: list.id as string,
      name: list.name as string,
      description: (list.description as string | null) ?? null,
      talentCount: mapped.length,
      createdAt: list.created_at as string,
      updatedAt: (list.updated_at as string) ?? (list.created_at as string),
      previewPeople: preview.map((member) => ({
        name: member.name,
        avatarUrl: member.avatarUrl,
      })),
      previewAvatars: preview
        .map((member) => member.avatarUrl)
        .filter((url): url is string => Boolean(url)),
      members: mapped,
    },
    error: null,
  };
}

export async function listSavedTalent(): Promise<{
  talent: LibraryTalent[];
  favoritesListId: string | null;
  error: string | null;
}> {
  const { supabase, userId, error } = await requireOwner();
  if (!supabase || !userId) return { talent: [], favoritesListId: null, error: error ?? "Not signed in" };

  const saved = await getOrCreateSavedTalentListId(supabase, userId);
  if (!saved.id) return { talent: [], favoritesListId: null, error: saved.error ?? "Could not load Library" };

  const { data: members, error: membersError } = await readPagedRows((from, to) => supabase
    .from("talent_list_members").select(MEMBER_ROW_SELECT).eq("list_id", saved.id!)
    .order("added_at", { ascending: false }).order("id").range(from, to));
  if (membersError) return { talent: [], favoritesListId: saved.id, error: membersError.message };
  const membershipByProfile = new Map<string, string[]>();
  const profileIds = [...new Set((members ?? []).map((row) => row.profile_id as string))];
  for (let index = 0; index < profileIds.length; index += 200) {
    const { data: collectionMembers, error: membershipError } = await readPagedRows((from, to) => supabase
      .from("talent_list_members").select("id, profile_id, list_id, talent_lists!inner(owner_id, kind, project_id)")
      .eq("talent_lists.owner_id", userId).eq("talent_lists.kind", "roster").is("talent_lists.project_id", null)
      .in("profile_id", profileIds.slice(index, index + 200)).order("id").range(from, to));
    if (membershipError) return { talent: [], favoritesListId: saved.id, error: membershipError.message };
    for (const row of collectionMembers ?? []) {
      const current = membershipByProfile.get(row.profile_id) ?? [];
      current.push(row.list_id);
      membershipByProfile.set(row.profile_id, current);
    }
  }
  const hydrated = await hydrateLibraryMembers(members ?? [], membershipByProfile);
  return { talent: hydrated.talent, favoritesListId: saved.id, error: hydrated.error };
}

export async function createCollection(input: {
  name: string;
  description?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { supabase, userId, error } = await requireOwner();
  if (!supabase || !userId) return { ok: false, error: error ?? "Not signed in" };

  const pro = await requireIndustryProFeature(userId, "roster_write");
  if (!pro.ok) return { ok: false, error: "Industry Pro is required to create rosters." };

  const name = input.name.trim();
  if (!name || name.length > 120) return { ok: false, error: "Use a roster name between 1 and 120 characters" };

  const description = input.description?.trim() || null;

  const { data, error: insertError } = await supabase
    .from("talent_lists")
    .insert({
      owner_id: userId,
      name,
      description,
      kind: "roster",
    })
    .select("id")
    .single();

  if (insertError) return { ok: false, error: insertError.message };
  revalidateLibrary();
  return { ok: true, id: data.id };
}

export async function updateCollection(input: {
  collectionId: string;
  name: string;
  description?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId, error } = await requireOwner();
  if (!supabase || !userId) return { ok: false, error: error ?? "Not signed in" };

  const name = input.name.trim();
  if (!name || name.length > 120) return { ok: false, error: "Use a roster name between 1 and 120 characters" };

  const { data: updated, error: updateError } = await supabase
    .from("talent_lists")
    .update({
      name,
      description: input.description?.trim() || null,
    })
    .eq("id", input.collectionId)
    .eq("owner_id", userId)
    .eq("kind", "roster").is("project_id", null).select("id").maybeSingle();

  if (!updated && !updateError) return { ok: false, error: "Collection not found or access changed" };
  if (updateError) return { ok: false, error: updateError.message };
  revalidateLibrary(input.collectionId);
  return { ok: true };
}

export async function duplicateCollection(
  collectionId: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { supabase, userId, error } = await requireOwner();
  if (!supabase || !userId) return { ok: false, error: error ?? "Not signed in" };

  const pro = await requireIndustryProFeature(userId, "roster_write");
  if (!pro.ok) return { ok: false, error: "Industry Pro is required to duplicate rosters." };

  const { data: source, error: sourceError } = await supabase
    .from("talent_lists")
    .select("id, name, description")
    .eq("id", collectionId)
    .eq("owner_id", userId)
    .eq("kind", "roster").is("project_id", null)
    .maybeSingle();

  if (sourceError) return { ok: false, error: sourceError.message };
  if (!source) return { ok: false, error: "Collection not found" };

  const { data: members, error: membersError } = await readPagedRows((from, to) => supabase
    .from("talent_list_members").select("profile_id").eq("list_id", collectionId).order("id").range(from, to));
  if (membersError) return { ok: false, error: membersError.message };

  const { data: created, error: createError } = await supabase
    .from("talent_lists")
    .insert({
      owner_id: userId,
      name: `${source.name} (Copy)`,
      description: source.description,
      kind: "roster",
    })
    .select("id")
    .single();

  if (createError) return { ok: false, error: createError.message };

  if (members?.length) {
    const { error: copyError } = await supabase.from("talent_list_members").insert(
      members.map((member) => ({ list_id: created.id, profile_id: member.profile_id })),
    );
    if (copyError) {
      const { error: cleanupError } = await supabase.from("talent_lists").delete().eq("id", created.id).eq("owner_id", userId);
      revalidateLibrary();
      return { ok: false, error: cleanupError ? "The copy is incomplete. Remove the empty copy and try again." : "Could not copy the members. The original collection is unchanged." };
    }
  }

  revalidateLibrary(created.id);
  return { ok: true, id: created.id };
}

export async function deleteCollection(
  collectionId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId, error } = await requireOwner();
  if (!supabase || !userId) return { ok: false, error: error ?? "Not signed in" };

  const { data: deleted, error: deleteError } = await supabase
    .from("talent_lists")
    .delete()
    .eq("id", collectionId)
    .eq("owner_id", userId)
    .eq("kind", "roster").is("project_id", null).select("id").maybeSingle();

  if (!deleted && !deleteError) return { ok: false, error: "Roster not found or access changed" };
  if (deleteError) return { ok: false, error: deleteError.message };
  revalidateLibrary();
  return { ok: true };
}

export async function addTalentToCollections(input: {
  profileIds: string[];
  collectionIds: string[];
  ensureSaved?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId, error } = await requireOwner();
  if (!supabase || !userId) return { ok: false, error: error ?? "Not signed in" };

  const pro = await requireIndustryProFeature(userId, "roster_write");
  if (!pro.ok) return { ok: false, error: "Industry Pro is required to update rosters." };

  const profileIds = [...new Set(input.profileIds.filter(Boolean))];
  const collectionIds = [...new Set(input.collectionIds.filter(Boolean))];
  if (!profileIds.length) return { ok: false, error: "Select at least one person" };

  // Validate every destination before a single, atomic membership upsert.
  if (collectionIds.length) {
    const { data: owned, error: ownershipError } = await supabase.from("talent_lists")
      .select("id").eq("owner_id", userId).eq("kind", "roster").is("project_id", null).in("id", collectionIds);
    if (ownershipError) return { ok: false, error: ownershipError.message };
    if (owned?.length !== collectionIds.length) return { ok: false, error: "A collection is unavailable or you no longer have access. Refresh and try again." };
  }
  const destinations = [...collectionIds];
  if (input.ensureSaved !== false) {
    const saved = await getOrCreateSavedTalentListId(supabase, userId);
    if (!saved.id) return { ok: false, error: saved.error ?? "Could not save talent" };
    destinations.push(saved.id);
  }
  if (!destinations.length) return { ok: false, error: "Choose a collection" };
  const rows = [...new Set(destinations)].flatMap((listId) => profileIds.map((profileId) => ({ list_id: listId, profile_id: profileId })));
  const { error: memberError } = await supabase.from("talent_list_members")
    .upsert(rows, { onConflict: "list_id,profile_id", ignoreDuplicates: true });
  if (memberError) return { ok: false, error: memberError.message };
  await trackServerEvent("talent_saved_to_list", { list_count: collectionIds.length, profile_count: profileIds.length });

  revalidateLibrary();
  for (const id of collectionIds) revalidatePath(`/library/${id}`);
  return { ok: true };
}

export async function removeTalentFromCollection(input: {
  collectionId: string;
  profileIds: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId, error } = await requireOwner();
  if (!supabase || !userId) return { ok: false, error: error ?? "Not signed in" };

  const { data: owned } = await supabase
    .from("talent_lists")
    .select("id")
    .eq("id", input.collectionId)
    .eq("owner_id", userId)
    .eq("kind", "roster").is("project_id", null)
    .maybeSingle();

  if (!owned) return { ok: false, error: "Collection not found" };

  const { error: deleteError } = await supabase
    .from("talent_list_members")
    .delete()
    .eq("list_id", input.collectionId)
    .in("profile_id", input.profileIds);

  if (deleteError) return { ok: false, error: deleteError.message };
  revalidateLibrary(input.collectionId);
  return { ok: true };
}

export async function unsaveTalent(profileIds: string[]): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId, error } = await requireOwner();
  if (!supabase || !userId) return { ok: false, error: error ?? "Not signed in" };

  const saved = await getOrCreateSavedTalentListId(supabase, userId);
  if (!saved.id) return { ok: false, error: saved.error ?? "Could not update Library" };

  // Saved talent and named/project rosters are independent, as on iOS.
  const { error: deleteError } = await supabase.from("talent_list_members")
    .delete().eq("list_id", saved.id).in("profile_id", [...new Set(profileIds)]);
  if (deleteError) return { ok: false, error: deleteError.message };

  revalidateLibrary();
  return { ok: true };
}

export async function isTalentSaved(profileId: string): Promise<boolean> {
  const { supabase, userId } = await requireOwner();
  if (!supabase || !userId) return false;

  const saved = await getOrCreateSavedTalentListId(supabase, userId);
  if (!saved.id) return false;

  const { data } = await supabase
    .from("talent_list_members")
    .select("id")
    .eq("list_id", saved.id)
    .eq("profile_id", profileId)
    .maybeSingle();

  return Boolean(data);
}
