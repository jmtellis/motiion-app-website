"use server";

import { revalidatePath } from "next/cache";

import { trackServerEvent } from "@/lib/analytics/track-server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const SAVED_TALENT_NAME = "Saved Talent";
const MEMBER_ROW_SELECT = "id, profile_id, added_at";

export type LibraryTalent = {
  id: string;
  profileId: string;
  addedAt: string;
  name: string;
  slug: string | null;
  location: string | null;
  avatarUrl: string | null;
  styles: string[];
  collectionIds: string[];
};

export type LibraryCollectionSummary = {
  id: string;
  name: string;
  description: string | null;
  talentCount: number;
  createdAt: string;
  updatedAt: string;
  previewAvatars: string[];
};

export type LibraryCollectionDetail = LibraryCollectionSummary & {
  members: LibraryTalent[];
};

type ProProfileRow = {
  id: string;
  user_id: string | null;
  slug: string | null;
  location_city: string | null;
  location_region: string | null;
  styles: string[] | null;
};

function fallbackNameFromSlug(slug: string | null | undefined) {
  if (!slug?.trim()) return "Talent";
  return slug
    .trim()
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatLocation(city: string | null | undefined, region: string | null | undefined) {
  return [city, region].filter(Boolean).join(", ") || null;
}

type HydratedMemberCard = {
  profile_id: string;
  slug: string | null;
  name: string;
  location: string | null;
  avatar_url: string | null;
  styles: string[] | null;
};

/**
 * Buyers often cannot read unverified `professional_profiles` under RLS.
 * Use a SECURITY DEFINER RPC after ownership is already verified.
 */
async function hydrateLibraryMembers(
  memberRows: { id: string; profile_id: string; added_at: string }[],
  collectionIdsByProfile: Map<string, string[]> = new Map(),
): Promise<LibraryTalent[]> {
  if (!memberRows.length) return [];

  const supabase = await createServerSupabaseClient();
  const profileIds = [...new Set(memberRows.map((row) => row.profile_id))];
  const cardsByProfileId = new Map<string, HydratedMemberCard>();

  if (supabase && profileIds.length) {
    const { data, error } = await supabase.rpc("hydrate_library_member_cards", {
      p_profile_ids: profileIds,
    });

    if (!error && Array.isArray(data)) {
      for (const row of data as HydratedMemberCard[]) {
        cardsByProfileId.set(row.profile_id, row);
      }
    } else {
      // Fallback for environments without the RPC / older DBs.
      const admin = createAdminSupabaseClient();
      const client = admin ?? supabase;
      const { data: pros } = await client
        .from("professional_profiles")
        .select("id, user_id, slug, location_city, location_region, styles")
        .in("id", profileIds);
      const proById = new Map(
        (pros ?? []).map((row) => [row.id as string, row as ProProfileRow & { user_id?: string | null }]),
      );
      const userIds = [
        ...new Set((pros ?? []).map((row) => row.user_id as string | null).filter(Boolean)),
      ] as string[];
      const { data: accounts } = userIds.length
        ? await client
            .from("profiles")
            .select("user_id, display_name, first_name, last_name, username, headshot_urls, working_locations")
            .in("user_id", userIds)
        : { data: [] as Record<string, unknown>[] };
      const accountByUser = new Map(
        (accounts ?? [])
          .filter((row) => Boolean(row.user_id))
          .map((row) => [row.user_id as string, row]),
      );
      for (const profileId of profileIds) {
        const pro = proById.get(profileId);
        const account = pro?.user_id ? accountByUser.get(pro.user_id) : null;
        const name =
          (account?.display_name as string | null)?.trim() ||
          [account?.first_name, account?.last_name].filter(Boolean).join(" ").trim() ||
          (account?.username as string | null)?.trim() ||
          fallbackNameFromSlug(pro?.slug);
        const urls = account?.headshot_urls as string[] | null;
        const avatar =
          urls?.find((url) => typeof url === "string" && url.trim())?.trim() || null;
        const working = account?.working_locations as unknown;
        const workingLocation = Array.isArray(working)
          ? String(working[0] ?? "").trim() || null
          : typeof working === "object" && working && "0" in (working as object)
            ? String((working as { 0?: string })[0] ?? "").trim() || null
            : null;
        cardsByProfileId.set(profileId, {
          profile_id: profileId,
          slug: pro?.slug ?? null,
          name,
          location: formatLocation(pro?.location_city, pro?.location_region) || workingLocation,
          avatar_url: avatar,
          styles: Array.isArray(pro?.styles) ? pro.styles.map(String).slice(0, 3) : [],
        });
      }
    }
  }

  return memberRows.map((row) => {
    const card = cardsByProfileId.get(row.profile_id);
    return {
      id: row.id,
      profileId: row.profile_id,
      addedAt: row.added_at,
      name: card?.name || "Talent",
      slug: card?.slug ?? null,
      location: card?.location ?? null,
      avatarUrl: card?.avatar_url ?? null,
      styles: Array.isArray(card?.styles) ? card.styles.map(String).slice(0, 3) : [],
      collectionIds: collectionIdsByProfile.get(row.profile_id) ?? [],
    };
  });
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
  const { data: existing } = await supabase
    .from("talent_lists")
    .select("id")
    .eq("owner_id", userId)
    .eq("kind", "favorites")
    .maybeSingle<{ id: string }>();

  if (existing?.id) return { id: existing.id };

  const { data: byName } = await supabase
    .from("talent_lists")
    .select("id")
    .eq("owner_id", userId)
    .eq("name", SAVED_TALENT_NAME)
    .maybeSingle<{ id: string }>();

  if (byName?.id) {
    await supabase.from("talent_lists").update({ kind: "favorites" }).eq("id", byName.id);
    return { id: byName.id };
  }

  const { data: created, error } = await supabase
    .from("talent_lists")
    .insert({ owner_id: userId, name: SAVED_TALENT_NAME, kind: "favorites" })
    .select("id")
    .single();

  if (error) return { id: null, error: error.message };
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

  const { data, error: queryError } = await supabase
    .from("talent_lists")
    .select("id, name, description, kind, project_id, created_at, updated_at")
    .eq("owner_id", userId)
    .eq("kind", "roster")
    .is("project_id", null)
    .order("updated_at", { ascending: false });

  if (queryError) return { collections: [], error: queryError.message };

  const listIds = (data ?? []).map((row) => row.id as string);
  const membersByList = new Map<string, LibraryTalent[]>();

  if (listIds.length) {
    const { data: members } = await supabase
      .from("talent_list_members")
      .select("id, list_id, profile_id, added_at")
      .in("list_id", listIds)
      .order("added_at", { ascending: false });

    const hydrated = await hydrateLibraryMembers(
      (members ?? []).map((member) => ({
        id: member.id as string,
        profile_id: member.profile_id as string,
        added_at: member.added_at as string,
      })),
    );
    const byProfileId = new Map(hydrated.map((member) => [member.profileId, member]));

    for (const member of members ?? []) {
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
    return {
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string | null) ?? null,
      talentCount: members.length,
      createdAt: row.created_at as string,
      updatedAt: (row.updated_at as string) ?? (row.created_at as string),
      previewAvatars: members
        .map((member) => member.avatarUrl)
        .filter((url): url is string => Boolean(url))
        .slice(0, 4),
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

  const { data: members, error: membersError } = await supabase
    .from("talent_list_members")
    .select(MEMBER_ROW_SELECT)
    .eq("list_id", collectionId)
    .order("added_at", { ascending: false });

  if (membersError) return { collection: null, error: membersError.message };

  const mapped = await hydrateLibraryMembers(
    (members ?? []).map((row) => ({
      id: row.id as string,
      profile_id: row.profile_id as string,
      added_at: row.added_at as string,
    })),
    new Map((members ?? []).map((row) => [row.profile_id as string, [collectionId]])),
  );

  return {
    collection: {
      id: list.id as string,
      name: list.name as string,
      description: (list.description as string | null) ?? null,
      talentCount: mapped.length,
      createdAt: list.created_at as string,
      updatedAt: (list.updated_at as string) ?? (list.created_at as string),
      previewAvatars: mapped.map((m) => m.avatarUrl).filter((url): url is string => Boolean(url)).slice(0, 4),
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

  const [{ data: members, error: membersError }, { data: collectionLists }] = await Promise.all([
    supabase
      .from("talent_list_members")
      .select(MEMBER_ROW_SELECT)
      .eq("list_id", saved.id)
      .order("added_at", { ascending: false }),
    supabase
      .from("talent_lists")
      .select("id")
      .eq("owner_id", userId)
      .eq("kind", "roster")
      .is("project_id", null),
  ]);

  if (membersError) return { talent: [], favoritesListId: saved.id, error: membersError.message };

  const collectionIds = (collectionLists ?? []).map((row) => row.id as string);
  const membershipByProfile = new Map<string, string[]>();

  if (collectionIds.length && (members ?? []).length) {
    const profileIds = (members ?? []).map((row) => row.profile_id as string);
    const { data: collectionMembers } = await supabase
      .from("talent_list_members")
      .select("profile_id, list_id")
      .in("list_id", collectionIds)
      .in("profile_id", profileIds);

    for (const row of collectionMembers ?? []) {
      const profileId = row.profile_id as string;
      const listId = row.list_id as string;
      const current = membershipByProfile.get(profileId) ?? [];
      current.push(listId);
      membershipByProfile.set(profileId, current);
    }
  }

  const talent = await hydrateLibraryMembers(
    (members ?? []).map((row) => ({
      id: row.id as string,
      profile_id: row.profile_id as string,
      added_at: row.added_at as string,
    })),
    membershipByProfile,
  );

  return { talent, favoritesListId: saved.id, error: null };
}

export async function createCollection(input: {
  name: string;
  description?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { supabase, userId, error } = await requireOwner();
  if (!supabase || !userId) return { ok: false, error: error ?? "Not signed in" };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required" };

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
  if (!name) return { ok: false, error: "Name is required" };

  const { error: updateError } = await supabase
    .from("talent_lists")
    .update({
      name,
      description: input.description?.trim() || null,
    })
    .eq("id", input.collectionId)
    .eq("owner_id", userId)
    .eq("kind", "roster");

  if (updateError) return { ok: false, error: updateError.message };
  revalidateLibrary(input.collectionId);
  return { ok: true };
}

export async function duplicateCollection(
  collectionId: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { supabase, userId, error } = await requireOwner();
  if (!supabase || !userId) return { ok: false, error: error ?? "Not signed in" };

  const { data: source, error: sourceError } = await supabase
    .from("talent_lists")
    .select("id, name, description")
    .eq("id", collectionId)
    .eq("owner_id", userId)
    .eq("kind", "roster")
    .maybeSingle();

  if (sourceError) return { ok: false, error: sourceError.message };
  if (!source) return { ok: false, error: "Collection not found" };

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

  const { data: members } = await supabase
    .from("talent_list_members")
    .select("profile_id")
    .eq("list_id", collectionId);

  if (members?.length) {
    await supabase.from("talent_list_members").insert(
      members.map((member) => ({
        list_id: created.id,
        profile_id: member.profile_id,
      })),
    );
  }

  revalidateLibrary(created.id);
  return { ok: true, id: created.id };
}

export async function deleteCollection(
  collectionId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId, error } = await requireOwner();
  if (!supabase || !userId) return { ok: false, error: error ?? "Not signed in" };

  const { error: deleteError } = await supabase
    .from("talent_lists")
    .delete()
    .eq("id", collectionId)
    .eq("owner_id", userId)
    .eq("kind", "roster");

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

  const profileIds = [...new Set(input.profileIds.filter(Boolean))];
  const collectionIds = [...new Set(input.collectionIds.filter(Boolean))];
  if (!profileIds.length) return { ok: false, error: "Select at least one person" };

  if (input.ensureSaved !== false) {
    const saved = await getOrCreateSavedTalentListId(supabase, userId);
    if (!saved.id) return { ok: false, error: saved.error ?? "Could not save to Library" };
    const { error: saveError } = await supabase.from("talent_list_members").upsert(
      profileIds.map((profileId) => ({ list_id: saved.id!, profile_id: profileId })),
      { onConflict: "list_id,profile_id", ignoreDuplicates: true },
    );
    if (saveError) return { ok: false, error: saveError.message };
  }

  if (collectionIds.length) {
    const { data: owned } = await supabase
      .from("talent_lists")
      .select("id")
      .eq("owner_id", userId)
      .eq("kind", "roster")
      .in("id", collectionIds);

    const ownedIds = new Set((owned ?? []).map((row) => row.id as string));
    const rows = collectionIds
      .filter((id) => ownedIds.has(id))
      .flatMap((listId) => profileIds.map((profileId) => ({ list_id: listId, profile_id: profileId })));

    if (rows.length) {
      const { error: memberError } = await supabase
        .from("talent_list_members")
        .upsert(rows, { onConflict: "list_id,profile_id", ignoreDuplicates: true });
      if (memberError) return { ok: false, error: memberError.message };

      for (const listId of ownedIds) {
        for (const profileId of profileIds) {
          await trackServerEvent("talent_saved_to_list", { list_id: listId, profile_id: profileId });
        }
      }
    }
  }

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
    .eq("kind", "roster")
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

  const { data: collectionLists } = await supabase
    .from("talent_lists")
    .select("id")
    .eq("owner_id", userId)
    .eq("kind", "roster")
    .is("project_id", null);

  const collectionIds = (collectionLists ?? []).map((row) => row.id as string);

  await Promise.all([
    supabase.from("talent_list_members").delete().eq("list_id", saved.id).in("profile_id", profileIds),
    collectionIds.length
      ? supabase.from("talent_list_members").delete().in("list_id", collectionIds).in("profile_id", profileIds)
      : Promise.resolve(null),
  ]);

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
