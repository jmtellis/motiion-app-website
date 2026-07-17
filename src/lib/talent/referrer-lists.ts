"use server";

import { getProfileAvatarUrl, getProfileInitials } from "@/lib/auth/avatar";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Talent } from "@/lib/talent-navigator/types";

export type ReferrerListSummary = {
  id: string;
  name: string;
  memberCount: number;
};

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

  return { lists, error: null };
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
    .select("id")
    .eq("id", listId)
    .eq("owner_talent_user_id", user.id)
    .maybeSingle();

  if (!list) return { talent: [], error: "List not found." };

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
