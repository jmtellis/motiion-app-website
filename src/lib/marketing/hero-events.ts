import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type HeroEventAvatar = { src: string | null; name: string };
export type HeroEventCard = {
  id: string; title: string; eyebrow: string; image: string | null;
  imagePosition: string; avatars: HeroEventAvatar[]; extra: number; live: boolean;
};

// Match iOS MeetTheCastHomeSelection and homeEventsCarouselItems.
const CARD_LIMIT = 5;
const AVATAR_LIMIT = 3;
const FIELDS = "id,title,activity_date,start_time,cover_image_url,cover_thumbnail_alignment,event_type,event_type_data,talent_appearance";

function publicImage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}

export async function loadHeroEventCards(): Promise<HeroEventCard[]> {
  try {
    // This server-only projection explicitly restricts privileged reads to the
    // public, active Meet the Cast feed; no private events or pending cast.
    const supabase = createAdminSupabaseClient() ?? await createServerSupabaseClient();
    if (!supabase) return [];
    const now = new Date();
    const end = new Date(now); end.setFullYear(end.getFullYear() + 1);
    const publicEvents = () => supabase.from("activities").select(FIELDS)
      .eq("type", "event").eq("status", "active").eq("is_private", false)
      .eq("sponsored_by_motiion", false);
    const [pinned, upcoming] = await Promise.all([
      publicEvents().eq("show_in_meet_the_cast", true)
        .order("activity_date", { ascending: false, nullsFirst: false })
        .order("start_time", { ascending: false, nullsFirst: false }).order("title").limit(50),
      publicEvents().gte("activity_date", now.toISOString().slice(0, 10))
        .lte("activity_date", end.toISOString().slice(0, 10))
        .order("activity_date").order("start_time").order("title").limit(200),
    ]);
    if (pinned.error || upcoming.error) console.warn("Meet the Cast event feed could not be fully loaded.");
    const events = [...new Map([...(pinned.data ?? []), ...(upcoming.data ?? [])]
      .map((event) => [event.id, event])).values()].slice(0, CARD_LIMIT);
    if (!events.length) return [];

    const { data: cast, error: castError } = await supabase.from("activity_featured_talent")
      .select("id,activity_id,talent_user_id,parent_id,display_name,sort_order")
      .in("activity_id", events.map((event) => event.id)).eq("status", "accepted").order("sort_order");
    if (castError) console.warn("Meet the Cast featured people could not be loaded.");
    const ids = [...new Set((cast ?? []).map((person) => person.talent_user_id).filter(Boolean))];
    const { data: talent } = ids.length
      ? await supabase.from("talent").select("id,full_name,headshot_url").in("id", ids)
      : { data: [] };
    const people = new Map((talent ?? []).map((person) => [person.id, person]));

    return events.map((event) => {
      const rows = (cast ?? []).filter((person) => person.activity_id === event.id);
      const appearance = event.talent_appearance ||
        (["showcase", "live_show"].includes(event.event_type) ? "featured_company" : event.event_type === "festival" ? "billed_artist_credits" : "flat_cast");
      const ordered = rows.filter((person) => !person.parent_id).flatMap((root) =>
        appearance === "flat_cast" ? [root, ...rows.filter((person) => person.parent_id === root.id)] : [root]);
      const avatars = ordered.map((person): HeroEventAvatar => {
        const profile = people.get(person.talent_user_id);
        return { src: publicImage(profile?.headshot_url), name: profile?.full_name || person.display_name || "Talent" };
      });
      const artists = event.event_type_data?.artists;
      const eyebrow = event.event_type === "tour"
        ? (Array.isArray(artists) ? artists.map((artist: { name?: string }) => artist.name).filter(Boolean).join(", ") : "")
        : (event.activity_date ? new Date(`${event.activity_date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }) : "");
      return {
        id: event.id, title: event.title, eyebrow,
        image: publicImage(event.cover_image_url),
        imagePosition: ["top", "center", "bottom"].includes(event.cover_thumbnail_alignment) ? event.cover_thumbnail_alignment : "top",
        avatars: avatars.slice(0, AVATAR_LIMIT), extra: Math.max(0, avatars.length - AVATAR_LIMIT), live: true,
      };
    });
  } catch {
    console.warn("Meet the Cast feed unavailable; omitting the hero carousel.");
    return [];
  }
}
