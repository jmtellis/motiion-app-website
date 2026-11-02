"use server";
import { currentBlockedUsers } from "@/lib/app/blocked-visibility";
import { allowsUser } from "@/lib/app/blocked-visibility-model";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CommunityArtist = { normalized_name: string; display_name: string; image_url?: string | null; brand_domain?: string | null; shared_credit_id?: string | null };
export type CommunityFeed = { groups: { artist_normalized: string; artist_display: string; experience_title: string; dancers: { user_id: string; full_name?: string | null; headshot_url?: string | null }[] }[]; activities: { id: string; title: string | null; activity_date: string | null }[] };
export async function loadCommunityFavorites() {
  const db = await createServerSupabaseClient();
  const user = db ? (await db.auth.getUser()).data.user : null;
  if (!db || !user) return { favorites: null, feed: null, error: "Sign in to see your followed artists." };
  const [favorites, feed, blocked] = await Promise.all([
    db.from("community_favorite_artists").select("normalized_name,display_name,image_url,brand_domain,shared_credit_id").eq("user_id", user.id).order("created_at", { ascending: false }),
    db.rpc("community_favorites_feed", { p_limit: 24 }),
    currentBlockedUsers(),
  ]);
  const rawFeed = feed.data as CommunityFeed | null;
  const visibleFeed = rawFeed ? { ...rawFeed, groups: (rawFeed.groups ?? []).map(group => ({ ...group, dancers: group.dancers.filter(person => allowsUser(person.user_id, blocked.ids)) })).filter(group => group.dancers.length) } : null;
  return { favorites: favorites.error ? null : favorites.data as CommunityArtist[], feed: feed.error || blocked.error ? null : visibleFeed, error: favorites.error || feed.error || blocked.error ? "Some artist updates could not be loaded. Please retry." : null };
}
export async function searchCommunityArtists(query: string): Promise<{ artists: CommunityArtist[]; error: string | null }> {
  const db = await createServerSupabaseClient();
  if (!db) return { artists: [], error: "Artist search is temporarily unavailable." };
  const result = await db.rpc("search_community_artists", { p_query: query.trim().slice(0,120), p_limit: 30 });
  return { artists: result.error ? [] : result.data ?? [], error: result.error ? "Artists could not be loaded. Please retry." : null };
}
export async function setCommunityArtistFollowing(artist: CommunityArtist, following: boolean) {
  const db = await createServerSupabaseClient();
  const user = db ? (await db.auth.getUser()).data.user : null;
  if (!db || !user) return { ok: false, error: "Sign in again to update your artists." };
  const normalized = typeof artist.normalized_name === "string" ? artist.normalized_name.trim().replace(/\s+/g, " ").toLowerCase() : "";
  const name = typeof artist.display_name === "string" ? artist.display_name.trim() : "";
  if (!normalized || normalized.length > 160 || !name || name.length > 160) return { ok: false, error: "Choose an artist from the search results." };
  const result = following ? await db.from("community_favorite_artists").upsert({ user_id: user.id, normalized_name: normalized, display_name: name, image_url: artist.image_url ?? null, brand_domain: artist.brand_domain ?? null, shared_credit_id: artist.shared_credit_id ?? null }, { onConflict: "user_id,normalized_name", ignoreDuplicates: true }) : await db.from("community_favorite_artists").delete().eq("user_id", user.id).eq("normalized_name", normalized);
  if (result.error) return { ok: false, error: "Your artists could not be updated. Please retry." };
  revalidatePath("/home");
  return { ok: true, error: null };
}
