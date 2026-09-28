"use server";

import { getProfileAvatarUrl, getProfileInitials } from "@/lib/auth/avatar";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Talent } from "@/lib/talent-navigator/types";

export type ReferrerListSummary = {
  id: string;
  name: string;
  memberCount: number;
  previewImageUrls?: string[];
  ownerName?: string;
  shared?: boolean;
};

export type TalentSaveState = {
  favorited: boolean;
  notifying: boolean;
  lists: Array<{ id: string; name: string; includes: boolean }>;
  error: string | null;
};

const PERSON_CONTENT_TYPE = "person";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function displayNameFromProfile(row: {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}): string {
  return (
    row.display_name?.trim() ||
    [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
    "Talent"
  );
}

function placeholderImage(name: string): string {
  const initials = getProfileInitials(name || "?");
  const hue =
    Math.abs(name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="533" viewBox="0 0 400 533"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:hsl(${hue},35%,28%)"/><stop offset="100%" style="stop-color:hsl(${hue},45%,18%)"/></linearGradient></defs><rect width="400" height="533" fill="url(#g)"/><text x="200" y="280" text-anchor="middle" font-family="system-ui,sans-serif" font-size="96" font-weight="600" fill="rgba(255,255,255,0.35)">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

async function hydrateUserIdsAsTalent(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  userIds: string[],
): Promise<Talent[]> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueIds.length) return [];

  const [{ data: profiles }, { data: proProfiles }] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, display_name, first_name, last_name, headshot_urls")
      .in("user_id", uniqueIds),
    supabase
      .from("professional_profiles")
      .select("id, user_id, slug, styles, location_city, location_region")
      .in("user_id", uniqueIds),
  ]);

  const profileByUser = new Map(
    (profiles ?? []).map((row) => [row.user_id as string, row]),
  );
  const proByUser = new Map(
    (proProfiles ?? []).map((row) => [row.user_id as string, row]),
  );

  return uniqueIds.map((userId) => {
    const profile = profileByUser.get(userId);
    const pro = proByUser.get(userId);
    const name = profile
      ? displayNameFromProfile(profile)
      : ((pro?.slug as string | undefined)?.replace(/-/g, " ") ?? "Talent");
    const city = (pro?.location_city as string | null) ?? undefined;
    const region = (pro?.location_region as string | null) ?? undefined;
    const headshots = (profile?.headshot_urls as string[] | null) ?? null;

    return {
      id: userId,
      slug: (pro?.slug as string | undefined) ?? userId,
      name,
      imageUrl: getProfileAvatarUrl(headshots) ?? placeholderImage(name),
      location: city ? (region ? `${city}, ${region}` : city) : undefined,
      styles: ((pro?.styles as string[] | null) ?? []).filter(Boolean),
      represented: false,
      isVerified: false,
    } satisfies Talent;
  });
}

export async function fetchReferrerFavorites(): Promise<{
  talent: Talent[];
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { talent: [], error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { talent: [], error: "You must be signed in." };

  const { data, error } = await supabase
    .from("talent_favorites")
    .select("favorited_talent_id")
    .eq("talent_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return { talent: [], error: error.message };

  const talent = await hydrateUserIdsAsTalent(
    supabase,
    (data ?? []).map((row) => row.favorited_talent_id as string),
  );
  return { talent, error: null };
}

export async function fetchReferrerFollowing(): Promise<{
  talent: Talent[];
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { talent: [], error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { talent: [], error: "You must be signed in." };

  const { data, error } = await supabase
    .from("profile_follows")
    .select("followed_id")
    .eq("follower_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return { talent: [], error: error.message };

  const talent = await hydrateUserIdsAsTalent(
    supabase,
    (data ?? []).map((row) => row.followed_id as string),
  );
  return { talent, error: null };
}

export async function fetchReferrerDiscoverLists(): Promise<{
  lists: ReferrerListSummary[];
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { lists: [], error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { lists: [], error: "You must be signed in." };

  const { data, error } = await supabase
    .from("talent_discover_lists")
    .select("id, name, talent_discover_list_members(count)")
    .eq("owner_talent_user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) return { lists: [], error: error.message };

  const lists: ReferrerListSummary[] = (data ?? []).map((row) => {
    const members = row.talent_discover_list_members as
      | { count?: number }[]
      | { count?: number }
      | null;
    const count = Array.isArray(members)
      ? Number(members[0]?.count ?? 0)
      : Number(members?.count ?? 0);
    return {
      id: row.id as string,
      name: (row.name as string) || "Untitled list",
      memberCount: count,
    };
  });

  return { lists: await attachPreviewImages(supabase, lists), error: null };
}

export async function fetchReferrerDiscoverListMembers(listId: string): Promise<{
  talent: Talent[];
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { talent: [], error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { talent: [], error: "You must be signed in." };

  const { data: list } = await supabase
    .from("talent_discover_lists")
    .select("id, owner_talent_user_id")
    .eq("id", listId)
    .maybeSingle();

  if (!list) return { talent: [], error: "List not found." };

  if (list.owner_talent_user_id !== user.id) {
    const { data: share } = await supabase
      .from("talent_discover_list_shares")
      .select("expires_at")
      .eq("list_id", listId)
      .eq("recipient_talent_user_id", user.id)
      .maybeSingle();
    const expiresAt = share?.expires_at ? new Date(share.expires_at as string) : null;
    if (!share || (expiresAt && expiresAt <= new Date())) {
      return { talent: [], error: "List not found." };
    }
  }

  const { data, error } = await supabase
    .from("talent_discover_list_members")
    .select("member_talent_id")
    .eq("list_id", listId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return { talent: [], error: error.message };

  const talent = await hydrateUserIdsAsTalent(
    supabase,
    (data ?? []).map((row) => row.member_talent_id as string),
  );
  return { talent, error: null };
}

type ServerSupabase = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { supabase: null, userId: null, error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase: null, userId: null, error: "You must be signed in." };
  return { supabase, userId: user.id, error: null };
}

async function attachPreviewImages(
  supabase: ServerSupabase,
  lists: ReferrerListSummary[],
): Promise<ReferrerListSummary[]> {
  if (!lists.length) return lists;
  const { data } = await supabase
    .from("talent_discover_list_members")
    .select("list_id, member_talent_id")
    .in(
      "list_id",
      lists.map((list) => list.id),
    )
    .order("created_at", { ascending: false })
    .limit(150);

  const idsByList = new Map<string, string[]>();
  for (const row of data ?? []) {
    const listId = row.list_id as string;
    const memberId = row.member_talent_id as string;
    const current = idsByList.get(listId) ?? [];
    if (current.length < 3) current.push(memberId);
    idsByList.set(listId, current);
  }

  const talent = await hydrateUserIdsAsTalent(supabase, [...idsByList.values()].flat());
  const imageById = new Map(talent.map((person) => [person.id, person.imageUrl]));

  return lists.map((list) => ({
    ...list,
    previewImageUrls: (idsByList.get(list.id) ?? [])
      .map((id) => imageById.get(id))
      .filter((url): url is string => Boolean(url)),
  }));
}

export async function fetchSharedWithMeLists(): Promise<{
  lists: ReferrerListSummary[];
  error: string | null;
}> {
  const { supabase, userId, error: authError } = await requireUser();
  if (!supabase || !userId) return { lists: [], error: authError };

  const { data: shares, error } = await supabase
    .from("talent_discover_list_shares")
    .select("list_id, expires_at, owner_talent_user_id")
    .eq("recipient_talent_user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) return { lists: [], error: error.message };

  const active = (shares ?? []).filter((share) => {
    if (!share.expires_at) return true;
    return new Date(share.expires_at as string) > new Date();
  });
  const listIds = active.map((share) => share.list_id as string);
  if (!listIds.length) return { lists: [], error: null };

  const { data, error: listError } = await supabase
    .from("talent_discover_lists")
    .select("id, name, owner_talent_user_id, talent_discover_list_members(count)")
    .in("id", listIds);

  if (listError) return { lists: [], error: listError.message };

  const ownerIds = [...new Set((data ?? []).map((row) => row.owner_talent_user_id as string))];
  const { data: owners } = ownerIds.length
    ? await supabase
        .from("profiles")
        .select("user_id, display_name, first_name, last_name")
        .in("user_id", ownerIds)
    : { data: [] };
  const ownerName = new Map(
    (owners ?? []).map((row) => [row.user_id as string, displayNameFromProfile(row)]),
  );
  const byId = new Map((data ?? []).map((row) => [row.id as string, row]));

  const lists: ReferrerListSummary[] = listIds.flatMap((id) => {
    const row = byId.get(id);
    if (!row) return [];
    const members = row.talent_discover_list_members as
      | { count?: number }[]
      | { count?: number }
      | null;
    const count = Array.isArray(members)
      ? Number(members[0]?.count ?? 0)
      : Number(members?.count ?? 0);
    return [{
      id,
      name: (row.name as string) || "Untitled list",
      memberCount: count,
      ownerName: ownerName.get(row.owner_talent_user_id as string),
      shared: true,
    }];
  });

  return { lists: await attachPreviewImages(supabase, lists), error: null };
}

export async function fetchRecentlyViewedTalent(): Promise<{
  talent: Talent[];
  error: string | null;
}> {
  const { supabase, userId, error: authError } = await requireUser();
  if (!supabase || !userId) return { talent: [], error: authError };

  const { data, error } = await supabase
    .from("recently_viewed")
    .select("content_id")
    .eq("user_id", userId)
    .eq("content_type", PERSON_CONTENT_TYPE)
    .order("viewed_at", { ascending: false })
    .limit(10);

  if (error) return { talent: [], error: error.message };
  const talent = await hydrateUserIdsAsTalent(
    supabase,
    (data ?? []).map((row) => row.content_id as string),
  );
  return { talent, error: null };
}

export async function recordProfileView(talentId: string): Promise<void> {
  if (!isUuid(talentId)) return;
  const { supabase, userId } = await requireUser();
  if (!supabase || !userId || userId === talentId) return;

  await supabase.from("recently_viewed").upsert(
    {
      user_id: userId,
      content_type: PERSON_CONTENT_TYPE,
      content_id: talentId,
      viewed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,content_type,content_id" },
  );
}

export async function clearRecentlyViewed(): Promise<{ error: string | null }> {
  const { supabase, userId, error: authError } = await requireUser();
  if (!supabase || !userId) return { error: authError };

  const { error } = await supabase
    .from("recently_viewed")
    .delete()
    .eq("user_id", userId)
    .eq("content_type", PERSON_CONTENT_TYPE);
  return { error: error?.message ?? null };
}

export async function fetchTalentSaveState(talentId: string): Promise<TalentSaveState> {
  const empty = { favorited: false, notifying: false, lists: [], error: null };
  if (!isUuid(talentId)) return empty;
  const { supabase, userId, error: authError } = await requireUser();
  if (!supabase || !userId) return { ...empty, error: authError };

  const [favorite, follow, lists, memberships] = await Promise.all([
    supabase
      .from("talent_favorites")
      .select("id")
      .eq("talent_id", userId)
      .eq("favorited_talent_id", talentId)
      .maybeSingle(),
    supabase
      .from("profile_follows")
      .select("followed_id")
      .eq("follower_id", userId)
      .eq("followed_id", talentId)
      .maybeSingle(),
    supabase
      .from("talent_discover_lists")
      .select("id, name")
      .eq("owner_talent_user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("talent_discover_list_members")
      .select("list_id")
      .eq("member_talent_id", talentId)
      .limit(100),
  ]);

  const included = new Set((memberships.data ?? []).map((row) => row.list_id as string));
  return {
    favorited: Boolean(favorite.data),
    notifying: Boolean(follow.data),
    lists: (lists.data ?? []).map((row) => ({
      id: row.id as string,
      name: (row.name as string) || "Untitled list",
      includes: included.has(row.id as string),
    })),
    error: favorite.error?.message ?? follow.error?.message ?? lists.error?.message ?? null,
  };
}

export async function toggleFavorite(talentId: string): Promise<{ favorited: boolean; error: string | null }> {
  if (!isUuid(talentId)) return { favorited: false, error: "Profile not found." };
  const { supabase, userId, error: authError } = await requireUser();
  if (!supabase || !userId) return { favorited: false, error: authError };
  if (userId === talentId) return { favorited: false, error: "You can't favorite yourself." };

  const { data: existing } = await supabase
    .from("talent_favorites")
    .select("id")
    .eq("talent_id", userId)
    .eq("favorited_talent_id", talentId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("talent_favorites")
      .delete()
      .eq("talent_id", userId)
      .eq("favorited_talent_id", talentId);
    return { favorited: false, error: error?.message ?? null };
  }

  const { error } = await supabase.from("talent_favorites").insert({
    talent_id: userId,
    favorited_talent_id: talentId,
    favorite_type: "dancer",
  });
  return { favorited: !error, error: error?.message ?? null };
}

export async function toggleNotifyMe(talentId: string): Promise<{ notifying: boolean; error: string | null }> {
  if (!isUuid(talentId)) return { notifying: false, error: "Profile not found." };
  const { supabase, userId, error: authError } = await requireUser();
  if (!supabase || !userId) return { notifying: false, error: authError };
  if (userId === talentId) return { notifying: false, error: "You can't notify yourself." };

  const { data: existing } = await supabase
    .from("profile_follows")
    .select("followed_id")
    .eq("follower_id", userId)
    .eq("followed_id", talentId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("profile_follows")
      .delete()
      .eq("follower_id", userId)
      .eq("followed_id", talentId);
    return { notifying: false, error: error?.message ?? null };
  }

  const { error } = await supabase.from("profile_follows").insert({
    follower_id: userId,
    followed_id: talentId,
  });
  return { notifying: !error, error: error?.message ?? null };
}

export async function createDiscoverList(name: string): Promise<{ id: string | null; error: string | null }> {
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) return { id: null, error: "Give the list a name." };
  const { supabase, userId, error: authError } = await requireUser();
  if (!supabase || !userId) return { id: null, error: authError };

  const { data, error } = await supabase
    .from("talent_discover_lists")
    .insert({ owner_talent_user_id: userId, name: trimmed })
    .select("id")
    .single();
  return { id: (data?.id as string | undefined) ?? null, error: error?.message ?? null };
}

export async function renameDiscoverList(
  listId: string,
  name: string,
): Promise<{ error: string | null }> {
  const trimmed = name.trim().slice(0, 80);
  if (!isUuid(listId) || !trimmed) return { error: "Give the list a name." };
  const { supabase, userId, error: authError } = await requireUser();
  if (!supabase || !userId) return { error: authError };

  const { error } = await supabase
    .from("talent_discover_lists")
    .update({ name: trimmed })
    .eq("id", listId)
    .eq("owner_talent_user_id", userId);
  return { error: error?.message ?? null };
}

export async function deleteDiscoverList(listId: string): Promise<{ error: string | null }> {
  if (!isUuid(listId)) return { error: "List not found." };
  const { supabase, userId, error: authError } = await requireUser();
  if (!supabase || !userId) return { error: authError };

  const { error } = await supabase
    .from("talent_discover_lists")
    .delete()
    .eq("id", listId)
    .eq("owner_talent_user_id", userId);
  return { error: error?.message ?? null };
}

export async function addToDiscoverList(
  listId: string,
  talentId: string,
): Promise<{ error: string | null }> {
  if (!isUuid(listId) || !isUuid(talentId)) return { error: "Couldn't update that list." };
  const { supabase, userId, error: authError } = await requireUser();
  if (!supabase || !userId) return { error: authError };

  const { error } = await supabase.from("talent_discover_list_members").upsert(
    { list_id: listId, member_talent_id: talentId },
    { onConflict: "list_id,member_talent_id", ignoreDuplicates: true },
  );
  return { error: error?.message ?? null };
}

export async function removeFromDiscoverList(
  listId: string,
  talentId: string,
): Promise<{ error: string | null }> {
  if (!isUuid(listId) || !isUuid(talentId)) return { error: "Couldn't update that list." };
  const { supabase, userId, error: authError } = await requireUser();
  if (!supabase || !userId) return { error: authError };

  const { error } = await supabase
    .from("talent_discover_list_members")
    .delete()
    .eq("list_id", listId)
    .eq("member_talent_id", talentId);
  return { error: error?.message ?? null };
}
