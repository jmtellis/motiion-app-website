"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { BuyerActivityItem } from "@/types/talent-buyer-dashboard";
import type { DashboardProfile } from "@/types/database";

export type BuyerRecentlyViewedItem = {
  id: string;
  type: "profile" | "project" | "event";
  title: string;
  meta: string;
  href: string;
  imageUrl?: string | null;
  viewedAt: string;
};

export type BuyerDashboardLiveData = {
  activityFeed: BuyerActivityItem[];
  recentlyViewed: BuyerRecentlyViewedItem[];
};

const PROFILE_CONTENT_TYPE = "profile";
const RECENT_CONTENT_TYPES = ["profile", "project", "event"] as const;

function slugFromUsername(username: string | null | undefined, fallbackId: string) {
  return username?.trim() || fallbackId;
}

function displayNameFromProfile(row: {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
} | null | undefined) {
  const display = row?.display_name?.trim();
  if (display) return display;
  const joined = [row?.first_name, row?.last_name].filter(Boolean).join(" ").trim();
  return joined || "Talent";
}

async function fetchPosterProjects(userId: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { projectIds: [] as string[], titleByProject: new Map<string, string>() };

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title")
    .eq("poster_id", userId);

  const projectIds = (projects ?? []).map((p) => p.id as string);
  const titleByProject = new Map(
    (projects ?? []).map((p) => [p.id as string, (p.title as string) || "Project"]),
  );
  return { projectIds, titleByProject };
}

async function fetchProfileLabels(userIds: string[]) {
  const labels = new Map<string, { name: string; slug: string }>();
  if (!userIds.length) return labels;

  const supabase = await createServerSupabaseClient();
  if (!supabase) return labels;

  const { data } = await supabase
    .from("profiles")
    .select("user_id, display_name, first_name, last_name, username")
    .in("user_id", userIds);

  for (const row of data ?? []) {
    const id = row.user_id as string;
    labels.set(id, {
      name: displayNameFromProfile(row),
      slug: slugFromUsername(row.username as string | null, id),
    });
  }
  return labels;
}

export async function recordBuyerContentView(
  contentType: (typeof RECENT_CONTENT_TYPES)[number],
  contentId: string,
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || (contentType === PROFILE_CONTENT_TYPE && user.id === contentId)) return;

  await supabase.from("recently_viewed").upsert(
    {
      user_id: user.id,
      content_type: contentType,
      content_id: contentId,
      viewed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,content_type,content_id" },
  );
}

export async function recordTalentProfileView(talentUserId: string): Promise<void> {
  return recordBuyerContentView(PROFILE_CONTENT_TYPE, talentUserId);
}

export async function fetchRecentlyViewedItems(
  viewerId: string,
  limit = 30,
): Promise<BuyerRecentlyViewedItem[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data: views } = await supabase
    .from("recently_viewed")
    .select("content_type, content_id, viewed_at")
    .eq("user_id", viewerId)
    .in("content_type", [...RECENT_CONTENT_TYPES])
    .order("viewed_at", { ascending: false })
    .limit(limit * 3);

  if (!views?.length) return [];

  const idsFor = (type: BuyerRecentlyViewedItem["type"]) =>
    views.filter((row) => row.content_type === type).map((row) => row.content_id as string);

  const profileIds = idsFor("profile");
  const projectIds = idsFor("project");
  const eventIds = idsFor("event");

  const [profileResult, projectResult, eventResult] = await Promise.all([
    profileIds.length
      ? supabase
          .from("profiles")
          .select("user_id, display_name, first_name, last_name, username, headshot_urls, working_locations")
          .in("user_id", profileIds)
      : Promise.resolve({ data: [] }),
    projectIds.length
      ? supabase.from("projects").select("id, title, project_type").in("id", projectIds)
      : Promise.resolve({ data: [] }),
    eventIds.length
      ? supabase.from("activities").select("id, title, type, activity_date").in("id", eventIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profiles = new Map((profileResult.data ?? []).map((row) => [row.user_id as string, row]));
  const projects = new Map((projectResult.data ?? []).map((row) => [row.id as string, row]));
  const events = new Map((eventResult.data ?? []).map((row) => [row.id as string, row]));

  const items = views.flatMap((view): BuyerRecentlyViewedItem[] => {
    const id = view.content_id as string;
    const viewedAt = view.viewed_at as string;

    if (view.content_type === "profile") {
      const row = profiles.get(id);
      if (!row) return [];
      const title =
        (row.display_name as string | null)?.trim() ||
        [(row.first_name as string | null), (row.last_name as string | null)]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        "Talent";
      const locations = row.working_locations as string[] | null;
      const headshots = row.headshot_urls as string[] | null;
      return [{
        id: `profile-${id}`,
        type: "profile",
        title,
        meta: `Profile · ${locations?.[0] ?? "Location TBD"}`,
        href: `/talent/${slugFromUsername(row.username as string | null, id)}`,
        imageUrl: headshots?.[0] ?? null,
        viewedAt,
      }];
    }

    if (view.content_type === "project") {
      const row = projects.get(id);
      if (!row) return [];
      const projectType = String(row.project_type ?? "project").replaceAll("_", " ");
      return [{
        id: `project-${id}`,
        type: "project",
        title: (row.title as string | null)?.trim() || "Untitled project",
        meta: `Project · ${projectType}`,
        href: `/projects/${id}`,
        viewedAt,
      }];
    }

    const row = events.get(id);
    if (!row) return [];
    const date = row.activity_date
      ? new Date(`${row.activity_date as string}T00:00:00`).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : "Date TBD";
    return [{
      id: `event-${id}`,
      type: "event",
      title: (row.title as string | null)?.trim() || "Untitled event",
      meta: `Event · ${date}`,
      href: "/calendar",
      viewedAt,
    }];
  });

  return items.slice(0, limit);
}

async function fetchActivityFromSizeSheets(userId: string, limit: number): Promise<BuyerActivityItem[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("size_sheet_requests")
    .select("id, talent_id, project_id, status, created_at, updated_at, responded_at")
    .eq("requester_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (!data?.length) return [];

  const labels = await fetchProfileLabels(data.map((row) => row.talent_id as string));
  const items: BuyerActivityItem[] = [];

  for (const row of data) {
    const talentId = row.talent_id as string;
    const label = labels.get(talentId);
    const name = label?.name ?? "Talent";
    const href = label ? `/talent/${label.slug}` : row.project_id ? `/projects/${row.project_id}` : "/talent";
    const status = String(row.status ?? "pending");

    items.push({
      id: `size-req-${row.id}`,
      type: "size_sheet_requested",
      title: "Measurements requested",
      description: `You requested sizing info from ${name}.`,
      timestamp: row.created_at as string,
      href,
    });

    if (status === "fulfilled" || status === "declined") {
      const responded = (row.responded_at as string | null) || (row.updated_at as string);
      items.push({
        id: `size-res-${row.id}`,
        type: "size_sheet_responded",
        title: status === "fulfilled" ? "Sizing info received" : "Sizing request declined",
        description:
          status === "fulfilled"
            ? `${name} sent their measurements.`
            : `${name} declined your sizing request.`,
        timestamp: responded,
        href,
      });
    }
  }

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

async function fetchActivityFromAvailability(userId: string, limit: number): Promise<BuyerActivityItem[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("availability_check_requests")
    .select(
      "id, talent_id, project_id, title, status, response_kind, created_at, updated_at, responded_at",
    )
    .eq("requester_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (!data?.length) return [];

  const labels = await fetchProfileLabels(data.map((row) => row.talent_id as string));
  const items: BuyerActivityItem[] = [];

  for (const row of data) {
    const talentId = row.talent_id as string;
    const label = labels.get(talentId);
    const name = label?.name ?? "Talent";
    const href = label ? `/talent/${label.slug}` : row.project_id ? `/projects/${row.project_id}` : "/talent";
    const checkTitle = (row.title as string | null)?.trim() || "Availability check";
    const status = String(row.status ?? "pending");

    items.push({
      id: `avail-req-${row.id}`,
      type: "availability_requested",
      title: "Availability check sent",
      description: `You sent “${checkTitle}” to ${name}.`,
      timestamp: row.created_at as string,
      href,
    });

    if (status === "submitted" || status === "declined") {
      const responded = (row.responded_at as string | null) || (row.updated_at as string);
      const kind = String(row.response_kind ?? "").toLowerCase();
      const responseLabel =
        status === "declined"
          ? "declined"
          : kind.includes("available")
            ? "available"
            : kind.includes("unavailable") || kind.includes("not")
              ? "unavailable"
              : "responded";

      items.push({
        id: `avail-res-${row.id}`,
        type: "availability_responded",
        title: "Availability response",
        description: `${name} ${responseLabel} on “${checkTitle}”.`,
        timestamp: responded,
        href,
      });
    }
  }

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

async function fetchActivityFromShortlists(
  projectIds: string[],
  titleByProject: Map<string, string>,
  limit: number,
): Promise<BuyerActivityItem[]> {
  if (!projectIds.length) return [];
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("casting_candidates")
    .select("id, project_id, display_name, status, updated_at, talent_profile_id")
    .in("project_id", projectIds)
    .in("status", ["shortlisted", "selected"])
    .order("updated_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const projectId = row.project_id as string;
    const projectTitle = titleByProject.get(projectId) ?? "Project";
    const name = (row.display_name as string | null)?.trim() || "Talent";
    const status = String(row.status);
    return {
      id: `candidate-${row.id}-${status}`,
      type: "talent_shortlisted" as const,
      title: status === "selected" ? "Talent selected" : "Talent shortlisted",
      description: `${name} was ${status} on ${projectTitle}.`,
      timestamp: row.updated_at as string,
      href: `/projects/${projectId}`,
    };
  });
}

async function fetchActivityFromCastings(
  projectIds: string[],
  titleByProject: Map<string, string>,
  limit: number,
): Promise<BuyerActivityItem[]> {
  if (!projectIds.length) return [];
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("castings")
    .select("id, project_id, title, status, created_at, updated_at")
    .in("project_id", projectIds)
    .in("status", ["open", "closed"])
    .order("updated_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const projectId = row.project_id as string;
    const projectTitle = titleByProject.get(projectId) ?? "Project";
    const castingTitle = (row.title as string | null)?.trim() || "Casting";
    const closed = row.status === "closed";
    return {
      id: `casting-${row.id}-${row.status}`,
      type: closed ? ("casting_closed" as const) : ("casting_published" as const),
      title: closed ? "Casting closed" : "Casting published",
      description: closed
        ? `${castingTitle} on ${projectTitle} was closed.`
        : `${castingTitle} on ${projectTitle} was published.`,
      timestamp: closed ? (row.updated_at as string) : (row.created_at as string),
      href: `/projects/${projectId}`,
    };
  });
}

async function fetchActivityFromInvites(userId: string, limit: number): Promise<BuyerActivityItem[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("invitations")
    .select(
      "id, project_id, status, created_at, sent_at, responded_at, professional_profiles(full_name, slug)",
    )
    .eq("invited_by", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data?.length) return [];

  const { titleByProject } = await fetchPosterProjects(userId);
  const items: BuyerActivityItem[] = [];

  for (const row of data) {
    const profile = row.professional_profiles as { full_name?: string; slug?: string } | null;
    const name = profile?.full_name?.trim() || "Talent";
    const projectId = row.project_id as string | null;
    const projectTitle = projectId ? titleByProject.get(projectId) ?? "Project" : "a project";
    const href = profile?.slug
      ? `/talent/${profile.slug}`
      : projectId
        ? `/projects/${projectId}`
        : "/projects";

    items.push({
      id: `invite-sent-${row.id}`,
      type: "invite_sent",
      title: "Invite sent",
      description: `You invited ${name} to ${projectTitle}.`,
      timestamp: ((row.sent_at as string | null) || (row.created_at as string)) as string,
      href,
    });

    if (row.responded_at) {
      const status = String(row.status ?? "responded");
      items.push({
        id: `invite-res-${row.id}`,
        type: "invitation_response",
        title: status === "accepted" ? "Invite accepted" : status === "declined" ? "Invite declined" : "Invite response",
        description: `${name} ${status === "accepted" || status === "declined" ? status : "responded to"} your invite for ${projectTitle}.`,
        timestamp: row.responded_at as string,
        href,
      });
    }
  }

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

async function fetchActivityFromSubmissions(
  projectIds: string[],
  titleByProject: Map<string, string>,
  limit: number,
): Promise<BuyerActivityItem[]> {
  if (!projectIds.length) return [];
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data: roles } = await supabase
    .from("roles")
    .select("id, title, project_id")
    .in("project_id", projectIds);

  const roleIds = (roles ?? []).map((r) => r.id as string);
  if (!roleIds.length) return [];

  const roleById = new Map(
    (roles ?? []).map((r) => [r.id as string, { title: r.title as string, projectId: r.project_id as string }]),
  );

  const [{ data: received }, { data: reviewed }] = await Promise.all([
    supabase
      .from("submissions")
      .select("id, full_name, status, submitted_at, role_id")
      .in("role_id", roleIds)
      .order("submitted_at", { ascending: false })
      .limit(limit),
    supabase
      .from("submissions")
      .select("id, full_name, status, reviewed_at, role_id")
      .in("role_id", roleIds)
      .not("reviewed_at", "is", null)
      .order("reviewed_at", { ascending: false })
      .limit(limit),
  ]);

  const items: BuyerActivityItem[] = [];

  for (const row of received ?? []) {
    if (!row.submitted_at) continue;
    const role = roleById.get(row.role_id as string);
    const projectTitle = role ? titleByProject.get(role.projectId) ?? "Project" : "Project";
    items.push({
      id: `sub-${row.id}`,
      type: "submission_received",
      title: "New submission received",
      description: `${row.full_name ?? "A talent"} applied to ${role?.title ?? "a role"} on ${projectTitle}.`,
      timestamp: row.submitted_at as string,
      href: role ? `/projects/${role.projectId}` : "/projects",
    });
  }

  for (const row of reviewed ?? []) {
    if (!row.reviewed_at) continue;
    const role = roleById.get(row.role_id as string);
    const projectTitle = role ? titleByProject.get(role.projectId) ?? "Project" : "Project";
    const status = String(row.status ?? "reviewed").replaceAll("_", " ");
    items.push({
      id: `sub-rev-${row.id}`,
      type: "submission_reviewed",
      title: "Submission reviewed",
      description: `You marked ${row.full_name ?? "a talent"} as ${status} on ${projectTitle}.`,
      timestamp: row.reviewed_at as string,
      href: role ? `/projects/${role.projectId}` : "/projects",
    });
  }

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

async function fetchActivityFromRosterAdds(userId: string, limit: number): Promise<BuyerActivityItem[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data: lists } = await supabase
    .from("talent_lists")
    .select("id, name")
    .eq("owner_id", userId);

  const listIds = (lists ?? []).map((l) => l.id as string);
  if (!listIds.length) return [];

  const nameByList = new Map(lists!.map((l) => [l.id as string, (l.name as string) ?? "Roster"]));

  const { data: members } = await supabase
    .from("talent_list_members")
    .select("id, list_id, profile_id, added_at, professional_profiles(full_name, slug)")
    .in("list_id", listIds)
    .order("added_at", { ascending: false })
    .limit(limit);

  return (members ?? []).map((row) => {
    const profile = row.professional_profiles as { full_name?: string; slug?: string } | null;
    const name = profile?.full_name?.trim() || "Talent";
    const listName = nameByList.get(row.list_id as string) ?? "Roster";
    return {
      id: `roster-${row.id}`,
      type: "talent_added_to_roster" as const,
      title: "Talent added to roster",
      description: `${name} added to ${listName}.`,
      timestamp: row.added_at as string,
      href: profile?.slug ? `/talent/${profile.slug}` : `/library/${row.list_id}`,
    };
  });
}

async function fetchActivityFromShortlistShares(userId: string, limit: number): Promise<BuyerActivityItem[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("casting_shortlist_shares")
    .select("id, title, role_id, created_at")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data?.length) return [];

  const roleIds = data.map((row) => row.role_id as string).filter(Boolean);
  const { data: roles } = roleIds.length
    ? await supabase.from("roles").select("id, project_id, title").in("id", roleIds)
    : { data: [] };

  const roleById = new Map(
    (roles ?? []).map((r) => [
      r.id as string,
      { projectId: r.project_id as string, title: (r.title as string) || "Role" },
    ]),
  );

  return data.map((row) => {
    const role = roleById.get(row.role_id as string);
    const title = (row.title as string | null)?.trim() || role?.title || "Shortlist";
    return {
      id: `share-${row.id}`,
      type: "shortlist_shared" as const,
      title: "Shortlist shared",
      description: `You shared “${title}” for client review.`,
      timestamp: row.created_at as string,
      href: role?.projectId ? `/projects/${role.projectId}` : "/projects",
    };
  });
}

export async function fetchBuyerActivityFeed(userId: string, limit = 30): Promise<BuyerActivityItem[]> {
  const perSource = Math.max(8, Math.ceil(limit / 4));
  const { projectIds, titleByProject } = await fetchPosterProjects(userId);

  const [
    sizeSheets,
    availability,
    shortlists,
    castings,
    invites,
    submissions,
    rosterAdds,
    shortlistShares,
  ] = await Promise.all([
    fetchActivityFromSizeSheets(userId, perSource),
    fetchActivityFromAvailability(userId, perSource),
    fetchActivityFromShortlists(projectIds, titleByProject, perSource),
    fetchActivityFromCastings(projectIds, titleByProject, perSource),
    fetchActivityFromInvites(userId, perSource),
    fetchActivityFromSubmissions(projectIds, titleByProject, perSource),
    fetchActivityFromRosterAdds(userId, perSource),
    fetchActivityFromShortlistShares(userId, perSource),
  ]);

  const merged = [
    ...sizeSheets,
    ...availability,
    ...shortlists,
    ...castings,
    ...invites,
    ...submissions,
    ...rosterAdds,
    ...shortlistShares,
  ];
  const seen = new Set<string>();
  const unique: BuyerActivityItem[] = [];

  for (const item of merged.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )) {
    const key = item.id;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= limit) break;
  }

  return unique;
}

export async function fetchBuyerDashboardLiveData(
  profile: DashboardProfile,
): Promise<BuyerDashboardLiveData> {
  const [activityFeed, recentlyViewed] = await Promise.all([
    fetchBuyerActivityFeed(profile.id, 30),
    fetchRecentlyViewedItems(profile.id, 30),
  ]);

  return {
    activityFeed,
    recentlyViewed,
  };
}
