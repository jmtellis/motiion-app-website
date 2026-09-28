import "server-only";

import { resolveLiveCatalogConfig } from "@/lib/catalog/live-catalog-config";
import { getAppEnvironment } from "@/lib/environment";
import { normalizeSearchProfile } from "@/lib/search/talent-filter-logic";
import type { PublicActivity } from "@/types/public";
import type { SearchProfileRecord } from "@/types/search";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USERNAME = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const SELECT = /^[a-z0-9_,]+$/;

export type LiveCollection = {
  id: string;
  eyebrow: string | null;
  headline: string;
  image_url: string | null;
  talent_ids: string[];
};

export type LiveCastPerson = {
  userId: string;
  name: string;
  src: string | null;
  username: string | null;
};

export type LiveHomeEvent = {
  id: string;
  title: string;
  activity_date: string | null;
  start_time: string | null;
  cover_image_url: string | null;
  sponsored_by_motiion: boolean;
  show_in_meet_the_cast: boolean;
  people: LiveCastPerson[];
};

type EventRow = Omit<LiveHomeEvent, "people">;
type CastRow = {
  id: string;
  activity_id: string;
  talent_user_id: string | null;
  parent_id: string | null;
  display_name: string | null;
  sort_order: number | null;
};
type TalentFace = { id: string; full_name: string | null; headshot_url: string | null; username: string | null };

function config() {
  return resolveLiveCatalogConfig(process.env, getAppEnvironment());
}

export function liveCatalogEnabled() {
  return config() !== null;
}

function publicImage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

async function restGet<T>(path: string, key: "anon" | "secret"): Promise<T | null> {
  const cfg = config();
  if (!cfg || path.startsWith("http") || path.includes("..")) return null;
  try {
    const res = await fetch(`${cfg.origin}/rest/v1/${path}`, {
      headers: {
        apikey: key === "anon" ? cfg.anonKey : cfg.secretKey,
        Authorization: `Bearer ${key === "anon" ? cfg.anonKey : cfg.secretKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("Live catalog read failed", res.status);
      return null;
    }
    return (await res.json()) as T;
  } catch {
    console.error("Live catalog read failed");
    return null;
  }
}

function ids(values: string[]) {
  return [...new Set(values.filter((value) => UUID.test(value)))].slice(0, 200);
}

/** Active featured collections. The list itself is not public to the anon key, so this is a filtered GET. */
export async function readLiveFeaturedCollections(): Promise<LiveCollection[]> {
  const rows = await restGet<LiveCollection[]>(
    "featured_carousel_items?select=id,eyebrow,headline,image_url,talent_ids&is_active=eq.true&order=priority.desc,updated_at.desc&limit=20",
    "secret",
  );
  return (rows ?? []).flatMap((row) => {
    const talentIds = ids(Array.isArray(row.talent_ids) ? row.talent_ids : []);
    if (!UUID.test(row.id) || !talentIds.length || !row.headline?.trim()) return [];
    return [{
      id: row.id,
      eyebrow: row.eyebrow?.trim() || null,
      headline: row.headline.trim(),
      image_url: publicImage(row.image_url),
      talent_ids: talentIds,
    }];
  });
}

const EVENT_SELECT = "id,title,activity_date,start_time,cover_image_url,sponsored_by_motiion,show_in_meet_the_cast";

export async function readLiveHomeEvents(): Promise<{ sponsored: LiveHomeEvent[]; cast: LiveHomeEvent[] } | null> {
  if (!config()) return null;
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date();
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  const endDate = end.toISOString().slice(0, 10);
  const publicEvents = `type=eq.event&status=eq.active&is_private=eq.false&select=${EVENT_SELECT}`;
  const [pinned, upcoming] = await Promise.all([
    restGet<EventRow[]>(
      `activities?${publicEvents}&show_in_meet_the_cast=eq.true&sponsored_by_motiion=eq.false&order=activity_date.desc.nullslast&limit=50`,
      "secret",
    ),
    restGet<EventRow[]>(
      `activities?${publicEvents}&activity_date=gte.${today}&activity_date=lte.${endDate}&order=activity_date.asc,start_time.asc&limit=200`,
      "secret",
    ),
  ]);
  if (!pinned || !upcoming) return null;

  const seen = new Set<string>();
  const cast = [...pinned, ...upcoming.filter((row) => !row.sponsored_by_motiion)].filter((row) => {
    if (!UUID.test(row.id) || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
  const sponsored = upcoming.filter((row) => row.sponsored_by_motiion && UUID.test(row.id));
  const visible = [...sponsored.slice(0, 8), ...cast.slice(0, 8)];
  const people = await castForEvents(visible.map((row) => row.id));
  const withPeople = (row: EventRow): LiveHomeEvent => ({
    ...row,
    title: row.title?.trim() || "Event",
    cover_image_url: publicImage(row.cover_image_url),
    people: people.get(row.id) ?? [],
  });
  return { sponsored: sponsored.map(withPeople), cast: cast.map(withPeople) };
}

async function castForEvents(eventIds: string[]): Promise<Map<string, LiveCastPerson[]>> {
  const result = new Map<string, LiveCastPerson[]>();
  const activityIds = ids(eventIds);
  if (!activityIds.length) return result;
  const rows = await restGet<CastRow[]>(
    `activity_featured_talent?select=id,activity_id,talent_user_id,parent_id,display_name,sort_order&status=eq.accepted&activity_id=in.(${activityIds.join(",")})&order=sort_order.asc`,
    "secret",
  );
  if (!rows?.length) return result;
  const talentIds = ids(rows.map((row) => row.talent_user_id ?? ""));
  const faces = talentIds.length
    ? await restGet<TalentFace[]>(
        `talent?select=id,full_name,headshot_url,username&id=in.(${talentIds.join(",")})&limit=${talentIds.length}`,
        "anon",
      )
    : [];
  const byId = new Map((faces ?? []).filter((row) => UUID.test(row.id)).map((row) => [row.id, row]));

  for (const activityId of activityIds) {
    const members = rows.filter((row) => row.activity_id === activityId);
    const ordered = members.filter((row) => !row.parent_id).flatMap((root) => [
      root,
      ...members.filter((row) => row.parent_id === root.id),
    ]);
    const unique = new Map<string, LiveCastPerson>();
    for (const member of ordered) {
      const face = member.talent_user_id ? byId.get(member.talent_user_id) : undefined;
      const userId = face?.id || member.talent_user_id;
      if (!userId || unique.has(userId)) continue;
      unique.set(userId, {
        userId,
        name: face?.full_name?.trim() || member.display_name?.trim() || "Talent",
        src: publicImage(face?.headshot_url),
        username: face?.username?.trim() || null,
      });
    }
    result.set(activityId, [...unique.values()]);
  }
  return result;
}

const SEARCH_SELECT = "id,username,full_name,headshot_url,headshot_urls,location,talent_types,styles,skills,representation,gender,ethnicity,height,union_status,profile_highlights";

export async function readLiveSearchProfiles(userIds: string[]): Promise<SearchProfileRecord[]> {
  const talentIds = ids(userIds);
  if (!talentIds.length || !config()) return [];
  const rows = await restGet<SearchProfileRecord[]>(
    `talent?select=${SEARCH_SELECT}&id=in.(${talentIds.join(",")})&limit=${talentIds.length}`,
    "anon",
  );
  if (!rows) return [];
  return rows
    .filter((row) => UUID.test(row.id))
    .map((row) => normalizeSearchProfile({
      ...row,
      headshot_url: publicImage(row.headshot_url),
      headshot_urls: Array.isArray(row.headshot_urls) ? row.headshot_urls.map(publicImage).filter((url): url is string => Boolean(url)) : null,
      display_name: row.full_name ?? null,
    }))
    .sort((a, b) => talentIds.indexOf(a.id) - talentIds.indexOf(b.id));
}

export async function readLiveTalentRow<T>(filter: string, select: string): Promise<T | null> {
  if (!SELECT.test(select) || !config()) return null;
  const idMatch = filter.match(/^id=eq\.([0-9a-f-]{36})$/i);
  const usernameMatch = filter.match(/^username=eq\.([^&]+)$/);
  let safeFilter: string | null = null;
  if (idMatch && UUID.test(idMatch[1])) safeFilter = `id=eq.${idMatch[1].toLowerCase()}`;
  if (usernameMatch) {
    const username = decodeURIComponent(usernameMatch[1]);
    if (USERNAME.test(username)) safeFilter = `username=eq.${encodeURIComponent(username)}`;
  }
  if (!safeFilter) return null;
  const rows = await restGet<T[]>(`talent?${safeFilter}&select=${select}&limit=1`, "anon");
  return rows?.[0] ?? null;
}

export async function readLivePublicActivity(id: string): Promise<PublicActivity | null> {
  const cfg = config();
  if (!cfg || !UUID.test(id)) return null;
  try {
    const res = await fetch(`${cfg.origin}/functions/v1/public-activity-detail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
      },
      body: JSON.stringify({ activityId: id.toLowerCase() }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { activity?: PublicActivity | null };
    return data.activity?.id ? data.activity : null;
  } catch {
    return null;
  }
}
