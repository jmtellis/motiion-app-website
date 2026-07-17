"use server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  fetchPosterCastingSummaries,
  splitCastingSummaries,
} from "@/lib/talent-buyers/casting-projects";
import type { ProjectActivitySummary } from "@/lib/talent-buyers/project-activities";
import type { BuyerProjectSummary } from "@/types/talent-buyer-dashboard";

const PROJECT_ROSTER_KIND = "project_roster";
const ROSTER_PREVIEW_LIMIT = 4;
const ACTIVITY_PREVIEW_LIMIT = 6;

export type ProjectHubRole = {
  id: string;
  title: string;
  status: string;
};

export type ProjectHubCasting = {
  id: string;
  title: string;
  status: string;
  isLegacy?: boolean;
};

export type ProjectHubRosterPreview = {
  id: string;
  displayName: string;
  headshotUrl?: string | null;
};

export type ProjectHubSummary = BuyerProjectSummary & {
  roles: ProjectHubRole[];
  castings: ProjectHubCasting[];
  activities: ProjectActivitySummary[];
  rosterCount: number;
  rosterPreview: ProjectHubRosterPreview[];
};

function mapActivityRow(
  row: Record<string, unknown>,
  counts: Map<string, number>,
): ProjectActivitySummary {
  const today = new Date().toISOString().slice(0, 10);
  const eventType = (["class", "session", "event"].includes(row.type as string)
    ? row.type
    : "event") as ProjectActivitySummary["eventType"];
  const activityDate = row.activity_date as string | null;
  const isUpcoming = !activityDate || activityDate >= today;

  return {
    id: row.id as string,
    title: (row.title as string) || "Untitled activity",
    eventType,
    status: row.status === "draft" ? "draft" : isUpcoming ? "upcoming" : "past",
    dateTime: activityDate
      ? `${activityDate}T${(row.start_time as string | null) ?? "00:00"}`
      : new Date().toISOString(),
    location: (row.location as string | null) ?? "Location TBD",
    attendeeCount: counts.get(row.id as string) ?? 0,
    coverImageUrl: (row.cover_image_url as string | null) ?? null,
  };
}

async function fetchRolesByProject(projectIds: string[]) {
  const supabase = await createServerSupabaseClient();
  if (!supabase || !projectIds.length) return new Map<string, ProjectHubRole[]>();

  const { data } = await supabase
    .from("roles")
    .select("id, project_id, title, is_active")
    .in("project_id", projectIds)
    .order("created_at", { ascending: true });

  const map = new Map<string, ProjectHubRole[]>();
  for (const row of data ?? []) {
    const projectId = row.project_id as string;
    const list = map.get(projectId) ?? [];
    list.push({
      id: row.id as string,
      title: (row.title as string) || "Untitled role",
      status: row.is_active === false ? "draft" : "active",
    });
    map.set(projectId, list);
  }
  return map;
}

async function fetchActivitiesByProject(projectIds: string[]) {
  const supabase = await createServerSupabaseClient();
  if (!supabase || !projectIds.length) return new Map<string, ProjectActivitySummary[]>();

  const { data } = await supabase
    .from("activities")
    .select("id, project_id, title, type, status, location, activity_date, start_time, cover_image_url")
    .in("project_id", projectIds)
    .neq("status", "cancelled")
    .order("activity_date", { ascending: true, nullsFirst: false });

  const rows = data ?? [];
  const counts = new Map<string, number>();

  if (rows.length) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("activity_id")
      .in(
        "activity_id",
        rows.map((row) => row.id as string),
      );

    for (const enrollment of enrollments ?? []) {
      const activityId = enrollment.activity_id as string;
      counts.set(activityId, (counts.get(activityId) ?? 0) + 1);
    }
  }

  const map = new Map<string, ProjectActivitySummary[]>();
  for (const row of rows) {
    const projectId = row.project_id as string;
    const list = map.get(projectId) ?? [];
    if (list.length < ACTIVITY_PREVIEW_LIMIT) {
      list.push(mapActivityRow(row as Record<string, unknown>, counts));
    }
    map.set(projectId, list);
  }
  return map;
}

async function fetchRosterPreviewsByProject(
  ownerId: string,
  projectIds: string[],
): Promise<Map<string, { count: number; preview: ProjectHubRosterPreview[] }>> {
  const supabase = await createServerSupabaseClient();
  const map = new Map<string, { count: number; preview: ProjectHubRosterPreview[] }>();
  if (!supabase || !projectIds.length) return map;

  const { data: lists } = await supabase
    .from("talent_lists")
    .select("id, project_id")
    .eq("owner_id", ownerId)
    .eq("kind", PROJECT_ROSTER_KIND)
    .in("project_id", projectIds);

  if (!lists?.length) return map;

  const listIds = lists.map((list) => list.id as string);
  const listByProject = new Map(lists.map((list) => [list.id as string, list.project_id as string]));

  const { data: members } = await supabase
    .from("talent_list_members")
    .select("id, list_id, profile_id, added_at, professional_profiles(slug, media_assets(url, kind, position))")
    .in("list_id", listIds)
    .order("added_at", { ascending: false });

  const admin = createAdminSupabaseClient();
  const profileIds = [...new Set((members ?? []).map((row) => row.profile_id as string))];
  const nameByProfileId = new Map<string, string>();

  if (admin && profileIds.length) {
    const { data: profiles } = await admin
      .from("professional_profiles")
      .select("id, user_id, slug")
      .in("id", profileIds);

    const userIds = (profiles ?? []).map((profile) => profile.user_id as string);
    const userIdByProfileId = new Map(
      (profiles ?? []).map((profile) => [profile.id as string, profile.user_id as string]),
    );
    const slugByProfileId = new Map(
      (profiles ?? []).map((profile) => [profile.id as string, profile.slug as string | null]),
    );

    if (userIds.length) {
      const { data: names } = await admin
        .from("profiles")
        .select("user_id, display_name, first_name, last_name")
        .in("user_id", userIds);

      const nameByUserId = new Map(
        (names ?? []).map((profile) => [
          profile.user_id as string,
          (profile.display_name as string | null) ||
            [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
            "Talent",
        ]),
      );

      for (const profileId of profileIds) {
        const userId = userIdByProfileId.get(profileId);
        const slug = slugByProfileId.get(profileId);
        const displayName =
          (userId ? nameByUserId.get(userId) : null) ??
          slug?.replace(/-/g, " ") ??
          "Talent";
        nameByProfileId.set(profileId, displayName);
      }
    }
  }

  const countsByProject = new Map<string, number>();
  const previewsByProject = new Map<string, ProjectHubRosterPreview[]>();

  for (const row of members ?? []) {
    const listId = row.list_id as string;
    const projectId = listByProject.get(listId);
    if (!projectId) continue;

    countsByProject.set(projectId, (countsByProject.get(projectId) ?? 0) + 1);

    const preview = previewsByProject.get(projectId) ?? [];
    if (preview.length < ROSTER_PREVIEW_LIMIT) {
      const profile = Array.isArray(row.professional_profiles)
        ? row.professional_profiles[0]
        : row.professional_profiles;
      const media =
        profile && typeof profile === "object"
          ? ((profile as { media_assets?: { url: string; kind: string }[] }).media_assets ?? [])
          : [];
      const headshot = media.find((asset) => asset.kind === "headshot") ?? media[0];
      const profileId = row.profile_id as string;

      preview.push({
        id: row.id as string,
        displayName: nameByProfileId.get(profileId) ?? "Talent",
        headshotUrl: headshot?.url ?? null,
      });
      previewsByProject.set(projectId, preview);
    }
  }

  for (const projectId of projectIds) {
    map.set(projectId, {
      count: countsByProject.get(projectId) ?? 0,
      preview: previewsByProject.get(projectId) ?? [],
    });
  }

  return map;
}

async function fetchCastingsByProject(
  projectIds: string[],
  summaries: BuyerProjectSummary[],
) {
  const supabase = await createServerSupabaseClient();
  const map = new Map<string, ProjectHubCasting[]>();
  if (!supabase || !projectIds.length) return map;

  const { data: castings } = await supabase
    .from("castings")
    .select("id, project_id, title, status")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });

  for (const row of castings ?? []) {
    const projectId = row.project_id as string;
    const list = map.get(projectId) ?? [];
    list.push({
      id: row.id as string,
      title: (row.title as string) || "Untitled casting",
      status: (row.status as string) || "draft",
    });
    map.set(projectId, list);
  }

  const { data: legacyRoles } = await supabase
    .from("roles")
    .select("project_id")
    .in("project_id", projectIds)
    .is("casting_id", null);

  const legacyRoleCounts = new Map<string, number>();
  for (const row of legacyRoles ?? []) {
    const projectId = row.project_id as string;
    legacyRoleCounts.set(projectId, (legacyRoleCounts.get(projectId) ?? 0) + 1);
  }

  for (const project of summaries) {
    if ((map.get(project.id) ?? []).length > 0) continue;
    if ((legacyRoleCounts.get(project.id) ?? 0) === 0) continue;

    map.set(project.id, [
      {
        id: `legacy-${project.id}`,
        title: project.title || "Untitled casting",
        status: project.status === "draft" ? "draft" : "open",
        isLegacy: true,
      },
    ]);
  }

  return map;
}

function enrichSummaries(
  summaries: BuyerProjectSummary[],
  rolesByProject: Map<string, ProjectHubRole[]>,
  castingsByProject: Map<string, ProjectHubCasting[]>,
  activitiesByProject: Map<string, ProjectActivitySummary[]>,
  rosterByProject: Map<string, { count: number; preview: ProjectHubRosterPreview[] }>,
): ProjectHubSummary[] {
  return summaries.map((project) => {
    const roster = rosterByProject.get(project.id) ?? { count: 0, preview: [] };
    return {
      ...project,
      roles: rolesByProject.get(project.id) ?? [],
      castings: castingsByProject.get(project.id) ?? [],
      activities: activitiesByProject.get(project.id) ?? [],
      rosterCount: roster.count,
      rosterPreview: roster.preview,
    };
  });
}

export async function fetchProjectsHubData(posterId: string) {
  const summaries = await fetchPosterCastingSummaries(posterId);
  const { drafts, published } = splitCastingSummaries(summaries);
  const allIds = summaries.map((project) => project.id);

  const [rolesByProject, activitiesByProject, rosterByProject, castingsByProject] =
    await Promise.all([
      fetchRolesByProject(allIds),
      fetchActivitiesByProject(allIds),
      fetchRosterPreviewsByProject(posterId, allIds),
      fetchCastingsByProject(allIds, summaries),
    ]);

  return {
    drafts: enrichSummaries(drafts, rolesByProject, castingsByProject, activitiesByProject, rosterByProject),
    published: enrichSummaries(published, rolesByProject, castingsByProject, activitiesByProject, rosterByProject),
  };
}
