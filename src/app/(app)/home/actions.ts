"use server";

import { homeEventDateLabel } from "@/lib/app/home-event-copy";
import { getProfileAvatarUrl } from "@/lib/auth/avatar";
import { requireTalentAccount } from "@/lib/auth/session";
import { fetchPublicActivity } from "@/lib/catalog/fetch-public-activity";
import { readLiveSearchProfiles } from "@/lib/catalog/live-catalog";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  featuredTalentEmptyMessage,
  formatTalentTypeDisplayLine,
  programCastNodes,
  resolveTalentAppearance,
} from "@/lib/publicActivity";
import { fetchPublicTalentProfile } from "@/lib/publicProfile";
import { searchCuratedTalent, searchTalentProfiles } from "@/lib/search/search-profiles";
import type { PublicActivity, PublicFeaturedTalent, PublicTalentProfile } from "@/types/public";
import type { SearchProfileRecord } from "@/types/search";

export type HomeRosterPerson = {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** Self-identified talent type, without an agency. */
  role: string | null;
  location: string | null;
  slug: string | null;
};

export type HomeEventSection = {
  id: string;
  title: string | null;
  detail: string | null;
  people: HomeRosterPerson[];
};

export type HomeEventDetail = {
  id: string;
  title: string;
  coverUrl: string | null;
  dateLabel: string;
  sections: HomeEventSection[];
  emptyMessage: string | null;
};

const SUBTYPES = ["dancer", "choreographer", "instructor"] as const;
type CommunitySubtype = (typeof SUBTYPES)[number];

type TalentPlace = { location: string | null; slug: string | null; role: string | null };

function placeLine(city: string | null | undefined, region: string | null | undefined) {
  const place = [city?.trim(), region?.trim()].filter(Boolean);
  return place.length ? place.join(", ") : null;
}

function personFromProfile(profile: SearchProfileRecord): HomeRosterPerson {
  const name = profile.display_name?.trim() || profile.full_name?.trim() || "Talent";
  const role = formatTalentTypeDisplayLine(profile.talent_types, "").trim();
  return {
    id: profile.id,
    name,
    avatarUrl: profile.headshot_url?.trim() || getProfileAvatarUrl(profile.headshot_urls),
    role: role || null,
    location: profile.location?.trim() || null,
    slug: profile.username?.trim() || null,
  };
}

function personFromTalent(node: PublicFeaturedTalent, places: Map<string, TalentPlace>): HomeRosterPerson {
  const place = (node.userId ? places.get(node.userId) : undefined) ?? (node.username ? places.get(node.username) : undefined);
  const role = formatTalentTypeDisplayLine(node.talentTypes, "").trim() || place?.role || "";
  return {
    id: node.userId || node.id,
    name: node.displayName,
    avatarUrl: node.headshotUrl,
    role: role || null,
    location: place?.location ?? null,
    slug: node.username?.trim() || place?.slug || null,
  };
}

function collectUserIds(nodes: PublicFeaturedTalent[]): string[] {
  return nodes.flatMap((node) => [node.userId, ...collectUserIds(node.children ?? [])].filter(Boolean));
}

function collectSlugs(nodes: PublicFeaturedTalent[]): string[] {
  return nodes.flatMap((node) => [node.username?.trim() || "", ...collectSlugs(node.children ?? [])].filter(Boolean));
}

async function lookupTalentPlaces(userIds: string[], slugs: string[]) {
  const places = new Map<string, TalentPlace>();
  const ids = [...new Set(userIds.filter(Boolean))];
  const names = [...new Set(slugs.map((slug) => slug.trim()).filter(Boolean))];
  if (!ids.length && !names.length) return places;
  const supabase = createAdminSupabaseClient() ?? (await createServerSupabaseClient());
  if (!supabase) return places;

  const [{ data: profiles }, { data: byUser }, { data: bySlug }] = await Promise.all([
    ids.length
      ? supabase.from("profiles").select("user_id, username, talent_types").in("user_id", ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from("professional_profiles").select("user_id, location_city, location_region, slug").in("user_id", ids)
      : Promise.resolve({ data: [] }),
    names.length
      ? supabase.from("professional_profiles").select("user_id, location_city, location_region, slug").in("slug", names)
      : Promise.resolve({ data: [] }),
  ]);
  const professional = [...(byUser ?? []), ...(bySlug ?? [])];
  const professionalById = new Map(professional.map((row) => [row.user_id as string, row]));
  const keys = [...new Set([...ids, ...professional.map((row) => row.user_id as string)])];
  for (const id of keys) {
    const profile = (profiles ?? []).find((row) => row.user_id === id);
    const work = professionalById.get(id);
    const role = formatTalentTypeDisplayLine(profile?.talent_types as string[] | null, "").trim();
    const place: TalentPlace = {
      location: placeLine(work?.location_city as string | null, work?.location_region as string | null),
      slug: (typeof profile?.username === "string" && profile.username.trim()) || (typeof work?.slug === "string" && work.slug.trim()) || null,
      role: role || null,
    };
    places.set(id, place);
    if (place.slug) places.set(place.slug, place);
  }

  const live = await readLiveSearchProfiles(ids);
  for (const profile of live) {
    const existing = places.get(profile.id);
    const place: TalentPlace = {
      location: existing?.location || profile.location?.trim() || null,
      slug: existing?.slug || profile.username?.trim() || null,
      role: existing?.role || formatTalentTypeDisplayLine(profile.talent_types, "").trim() || null,
    };
    places.set(profile.id, place);
    if (place.slug) places.set(place.slug, place);
  }
  return places;
}

export async function loadHomeProfile(
  slug: string,
  userId?: string,
): Promise<{ profile: PublicTalentProfile | null }> {
  await requireTalentAccount();
  const profile =
    (await fetchPublicTalentProfile(slug)) ??
    (userId && userId !== slug ? await fetchPublicTalentProfile(userId) : null);
  return { profile };
}

export async function loadCommunityRoster(input: {
  talentIds: string[];
  subtype: CommunitySubtype | null;
}): Promise<{ people: HomeRosterPerson[]; error: string | null }> {
  await requireTalentAccount();
  const talentIds = input.talentIds.map((id) => id.trim()).filter(Boolean);
  const subtype = input.subtype && SUBTYPES.includes(input.subtype) ? input.subtype : null;

  if (talentIds.length) {
    const result = await searchCuratedTalent(talentIds);
    if (result.source === "unavailable") return { people: [], error: "Could not load this list." };
    return { people: result.items.map(personFromProfile), error: null };
  }

  if (!subtype) return { people: [], error: null };
  const result = await searchTalentProfiles({ subtype, navigator: true });
  if (result.source === "unavailable") return { people: [], error: "Could not load this list." };
  return { people: result.items.slice(0, 48).map(personFromProfile), error: null };
}

export async function loadHomeEventDetail(
  eventId: string,
): Promise<{ event: HomeEventDetail | null; error: string | null }> {
  await requireTalentAccount();
  const id = eventId.trim();
  if (!id) return { event: null, error: "Event not found." };

  const activity = (await fetchPublicActivity(id)) ?? (await loadLocalPublicEvent(id));
  if (!activity) return { event: null, error: "This event could not be opened." };

  const appearance = resolveTalentAppearance(activity);
  const roots = activity.featuredTalent ?? [];
  const places = await lookupTalentPlaces(collectUserIds(roots), collectSlugs(roots));
  const segmented = appearance === "featured_company" && roots.some((root) => root.children.length > 0);
  const sections: HomeEventSection[] = segmented
    ? roots.map((root) => {
        const person = personFromTalent(root, places);
        return {
          id: root.id || root.userId,
          title: root.displayName,
          detail: [person.role, person.location].filter(Boolean).join(" · ") || null,
          people: (root.children.length ? root.children : [root]).map((node) => personFromTalent(node, places)),
        };
      })
    : [
        {
          id: "cast",
          title: null,
          detail: null,
          people: programCastNodes(activity).map((node) => personFromTalent(node, places)),
        },
      ];
  const hasPeople = sections.some((section) => section.people.length > 0);

  return {
    event: {
      id: activity.id,
      title: activity.title,
      coverUrl: activity.coverImageURL,
      dateLabel: homeEventDateLabel(activity.activityDate, activity.startTime),
      sections,
      emptyMessage: hasPeople ? null : featuredTalentEmptyMessage(appearance),
    },
    error: null,
  };
}

/** Staging events the public detail function does not return, limited to active public events. */
async function loadLocalPublicEvent(id: string): Promise<PublicActivity | null> {
  const supabase = createAdminSupabaseClient() ?? (await createServerSupabaseClient());
  if (!supabase) return null;

  const { data: activity } = await supabase
    .from("activities")
    .select("id,title,activity_date,start_time,cover_image_url,event_type,talent_appearance")
    .eq("id", id)
    .eq("type", "event")
    .eq("status", "active")
    .eq("is_private", false)
    .maybeSingle();
  if (!activity) return null;

  const { data: members } = await supabase
    .from("activity_featured_talent")
    .select("id,talent_user_id,parent_id,display_name,sort_order")
    .eq("activity_id", activity.id)
    .eq("status", "accepted")
    .order("sort_order");

  const userIds = [...new Set((members ?? []).map((member) => member.talent_user_id).filter(Boolean))] as string[];
  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("user_id,display_name,first_name,last_name,username,headshot_urls,talent_types")
        .in("user_id", userIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((profile) => [profile.user_id as string, profile]));

  const toNode = (
    member: NonNullable<typeof members>[number],
    children: PublicFeaturedTalent[],
  ): PublicFeaturedTalent => {
    const profile = member.talent_user_id ? profileById.get(member.talent_user_id) : undefined;
    const name =
      (typeof profile?.display_name === "string" && profile.display_name.trim()) ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
      member.display_name?.trim() ||
      "Talent";
    return {
      id: member.id,
      userId: member.talent_user_id ?? member.id,
      displayName: name,
      headshotUrl: getProfileAvatarUrl(profile?.headshot_urls as string[] | null),
      username: typeof profile?.username === "string" ? profile.username : null,
      talentTypes: (profile?.talent_types as string[] | null) ?? null,
      videoUrl: null,
      children,
    };
  };

  const rows = members ?? [];
  const featuredTalent = rows
    .filter((member) => !member.parent_id)
    .map((root) => toNode(root, rows.filter((member) => member.parent_id === root.id).map((child) => toNode(child, []))));

  return {
    id: activity.id,
    title: activity.title,
    kind: "event",
    coverImageURL: activity.cover_image_url,
    activityDate: activity.activity_date,
    startTime: activity.start_time,
    talentAppearance: activity.talent_appearance,
    eventType: activity.event_type,
    featuredTalent,
  } as PublicActivity;
}
