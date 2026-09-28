import { cache } from "react";
import { liveCatalogEnabled, readLiveFeaturedCollections, readLiveHomeEvents, type LiveCastPerson } from "@/lib/catalog/live-catalog";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type FeaturedCollection = { id: string; eyebrow: string | null; headline: string; image_url: string | null; talent_ids: string[] };
export type HomeEventPerson = LiveCastPerson;
export type HomeEvent = {
  id: string;
  title: string;
  activity_date: string | null;
  start_time: string | null;
  cover_image_url: string | null;
  sponsored_by_motiion: boolean;
  show_in_meet_the_cast: boolean;
  people: HomeEventPerson[];
};

/** Same curated source as FeaturedCarouselRepository on iOS. No CMS writes on page load. */
export const fetchHomeCollections = cache(async (): Promise<FeaturedCollection[]> => {
  if (liveCatalogEnabled()) {
    const live = await readLiveFeaturedCollections();
    if (live.length) return live;
  }
  const client = await createServerSupabaseClient();
  if (!client) return [];
  const { data, error } = await client.from("featured_carousel_items")
    .select("id,eyebrow,headline,image_url,talent_ids").eq("is_active", true)
    .order("priority", { ascending: false }).order("updated_at", { ascending: false }).limit(20);
  if (error) { console.error("Home collections unavailable", error.code); return []; }
  return (data ?? []).filter(row => Array.isArray(row.talent_ids) && row.talent_ids.length > 0);
});

/** Local Motiion events are merged in so staging-only sponsored events show next to the live catalog. */
export const fetchHomeEvents = cache(async () => {
  const [live, local] = await Promise.all([liveCatalogEnabled() ? readLiveHomeEvents() : null, fetchLocalHomeEvents()]);
  if (!live || !(live.sponsored.length || live.cast.length)) return local;
  const liveIds = new Set(live.sponsored.map(event => event.id));
  const sponsored = [...live.sponsored, ...local.sponsored.filter(event => !liveIds.has(event.id))]
    .sort((a, b) => (a.activity_date ?? "9999").localeCompare(b.activity_date ?? "9999"));
  return { sponsored, cast: live.cast };
});

async function fetchLocalHomeEvents(): Promise<{ sponsored: HomeEvent[]; cast: HomeEvent[] }> {
  const client = await createServerSupabaseClient();
  if (!client) return { sponsored: [], cast: [] };
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date(); end.setUTCFullYear(end.getUTCFullYear() + 1);
  const select = "id,title,activity_date,start_time,cover_image_url,sponsored_by_motiion,show_in_meet_the_cast";
  const base = () => client.from("activities").select(select).eq("type", "event").eq("status", "active").eq("is_private", false);
  const [pinned, upcoming] = await Promise.all([
    base().eq("show_in_meet_the_cast", true).eq("sponsored_by_motiion", false).order("activity_date", { ascending: false }).limit(50),
    base().gte("activity_date", today).lte("activity_date", end.toISOString().slice(0,10)).order("activity_date", { ascending: true }).order("start_time", { ascending: true }).limit(200),
  ]);
  if (pinned.error || upcoming.error) console.error("Home events unavailable", pinned.error?.code, upcoming.error?.code);
  const seen = new Set<string>();
  const cast = [...(pinned.data ?? []), ...(upcoming.data ?? []).filter(row => !row.sponsored_by_motiion)].filter(row => {
    if (seen.has(row.id)) return false; seen.add(row.id); return true;
  }).map(row => ({ ...row, people: [] })) as HomeEvent[];
  return { sponsored: (upcoming.data ?? []).filter(row => row.sponsored_by_motiion).map(row => ({ ...row, people: [] })) as HomeEvent[], cast };
}
