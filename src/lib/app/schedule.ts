import { cache } from "react";

import { formatActivitySchedule } from "@/lib/app/home";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UpcomingActivity } from "@/types/app";

export type ScheduleCategoryId = "classes" | "sessions" | "events" | "submissions";

export type TalentSubmissionItem = {
  id: string;
  status: string | null;
  submittedAt: string | null;
  roleId: string | null;
  roleTitle: string | null;
  projectTitle: string | null;
  castingHref: string | null;
};

export type ScheduleHubData = {
  upcoming: UpcomingActivity[];
  categories: Array<{
    id: ScheduleCategoryId;
    label: string;
    count: number;
    emptyTitle: string;
    emptyDescription: string;
  }>;
  byCategory: Record<Exclude<ScheduleCategoryId, "submissions">, UpcomingActivity[]>;
  submissions: TalentSubmissionItem[];
};

type ActivitySummary = {
  id: string;
  title: string;
  type: string | null;
  activity_date: string | null;
  start_time: string | null;
  cover_image_url: string | null;
  status: string | null;
};

const CATEGORY_META: Record<
  ScheduleCategoryId,
  { label: string; emptyTitle: string; emptyDescription: string }
> = {
  classes: {
    label: "Classes",
    emptyTitle: "No classes yet",
    emptyDescription: "When you have upcoming classes, they will appear here.",
  },
  sessions: {
    label: "Sessions",
    emptyTitle: "No sessions yet",
    emptyDescription: "When you have upcoming sessions, they will appear here.",
  },
  events: {
    label: "Events",
    emptyTitle: "No events yet",
    emptyDescription: "When you have upcoming events, they will appear here.",
  },
  submissions: {
    label: "Submissions",
    emptyTitle: "No submissions yet",
    emptyDescription:
      "Castings you submit to will show up here, with their status as they move through review.",
  },
};

function normalizeJoinedActivity(raw: unknown): ActivitySummary | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.title !== "string") return null;
  return {
    id: row.id,
    title: row.title,
    type: typeof row.type === "string" ? row.type : null,
    activity_date: typeof row.activity_date === "string" ? row.activity_date : null,
    start_time: typeof row.start_time === "string" ? row.start_time : null,
    cover_image_url: typeof row.cover_image_url === "string" ? row.cover_image_url : null,
    status: typeof row.status === "string" ? row.status : null,
  };
}

function toUpcoming(row: ActivitySummary, role: UpcomingActivity["role"]): UpcomingActivity {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    activity_date: row.activity_date,
    start_time: row.start_time,
    cover_image_url: row.cover_image_url,
    role,
  };
}

function activityHref(item: UpcomingActivity) {
  if (item.type === "event") return `/event/${item.id}`;
  return `/activity/${item.id}`;
}

function isUpcomingDate(activityDate: string | null) {
  if (!activityDate) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${activityDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return true;
  return date >= today;
}

function categoryForType(type: string | null): Exclude<ScheduleCategoryId, "submissions"> | null {
  if (type === "class") return "classes";
  if (type === "session") return "sessions";
  if (type === "event") return "events";
  return null;
}

async function fetchTalentActivities(userId: string): Promise<UpcomingActivity[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const [
    { data: enrollments },
    { data: hosting },
    { data: featuredTalent },
    { data: joinRequests },
    { data: invites },
  ] = await Promise.all([
    supabase
      .from("enrollments")
      .select(
        "status, activities ( id, title, type, activity_date, start_time, cover_image_url, status )",
      )
      .eq("student_id", userId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("activities")
      .select("id, title, type, activity_date, start_time, cover_image_url, status")
      .eq("creator_id", userId)
      .neq("status", "cancelled")
      .in("type", ["class", "session", "event"])
      .order("activity_date", { ascending: true, nullsFirst: false })
      .limit(40),
    supabase
      .from("activity_featured_talent")
      .select(
        "activity_id, activities ( id, title, type, activity_date, start_time, cover_image_url, status )",
      )
      .eq("talent_user_id", userId)
      .eq("status", "accepted")
      .limit(40),
    supabase
      .from("session_join_requests")
      .select(
        "status, activities ( id, title, type, activity_date, start_time, cover_image_url, status )",
      )
      .eq("requester_id", userId)
      .eq("status", "approved")
      .limit(40),
    supabase
      .from("activity_invites")
      .select(
        "response_status, activities ( id, title, type, activity_date, start_time, cover_image_url, status )",
      )
      .eq("invited_user_id", userId)
      .eq("response_status", "accepted")
      .eq("is_active", true)
      .limit(40),
  ]);

  const fromJoined = (rows: unknown[] | null, role: UpcomingActivity["role"]) =>
    (rows ?? [])
      .map((row) => {
        const joined = (row as { activities?: unknown }).activities;
        const activity = Array.isArray(joined) ? joined[0] : joined;
        return normalizeJoinedActivity(activity);
      })
      .filter((activity): activity is ActivitySummary => Boolean(activity))
      .filter((activity) => ["class", "session", "event"].includes(activity.type ?? ""))
      .map((activity) => toUpcoming(activity, role));

  const hosted = (hosting ?? [])
    .map((row) => normalizeJoinedActivity(row))
    .filter((activity): activity is ActivitySummary => Boolean(activity))
    .map((activity) => toUpcoming(activity, "hosting"));

  const merged = [
    ...hosted,
    ...fromJoined(enrollments as unknown[] | null, "attending"),
    ...fromJoined(featuredTalent as unknown[] | null, "attending"),
    ...fromJoined(joinRequests as unknown[] | null, "attending"),
    ...fromJoined(invites as unknown[] | null, "attending"),
  ];

  const seen = new Set<string>();
  return merged
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => {
      const aKey = `${a.activity_date ?? "9999-99-99"} ${a.start_time ?? ""}`;
      const bKey = `${b.activity_date ?? "9999-99-99"} ${b.start_time ?? ""}`;
      return aKey.localeCompare(bKey);
    });
}

async function fetchTalentSubmissions(userId: string): Promise<TalentSubmissionItem[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("submissions")
    .select(
      "id, status, submitted_at, role_id, roles ( id, title, project_id, projects ( id, title ) )",
    )
    .eq("talent_id", userId)
    .order("submitted_at", { ascending: false })
    .limit(40);

  return (data ?? []).map((row) => {
    const roleJoined = (row as { roles?: unknown }).roles;
    const role = (Array.isArray(roleJoined) ? roleJoined[0] : roleJoined) as
      | {
          id?: string;
          title?: string;
          project_id?: string;
          projects?: { id?: string; title?: string } | Array<{ id?: string; title?: string }>;
        }
      | null;
    const projectJoined = role?.projects;
    const project = Array.isArray(projectJoined) ? projectJoined[0] : projectJoined;
    const castingId = project?.id ?? role?.project_id ?? null;

    return {
      id: row.id as string,
      status: typeof row.status === "string" ? row.status : null,
      submittedAt: typeof row.submitted_at === "string" ? row.submitted_at : null,
      roleId: typeof row.role_id === "string" ? row.role_id : null,
      roleTitle: typeof role?.title === "string" ? role.title : null,
      projectTitle: typeof project?.title === "string" ? project.title : null,
      castingHref: castingId ? `/casting/${castingId}` : null,
    };
  });
}

export const fetchTalentScheduleHub = cache(async (userId: string): Promise<ScheduleHubData> => {
  const [activities, submissions] = await Promise.all([
    fetchTalentActivities(userId),
    fetchTalentSubmissions(userId),
  ]);

  const upcoming = activities.filter((item) => isUpcomingDate(item.activity_date));
  const byCategory: ScheduleHubData["byCategory"] = {
    classes: [],
    sessions: [],
    events: [],
  };

  for (const item of upcoming) {
    const category = categoryForType(item.type);
    if (category) byCategory[category].push(item);
  }

  const categories: ScheduleHubData["categories"] = (
    ["classes", "sessions", "events", "submissions"] as ScheduleCategoryId[]
  ).map((id) => ({
    id,
    label: CATEGORY_META[id].label,
    count: id === "submissions" ? submissions.length : byCategory[id].length,
    emptyTitle: CATEGORY_META[id].emptyTitle,
    emptyDescription: CATEGORY_META[id].emptyDescription,
  }));

  return { upcoming, categories, byCategory, submissions };
});

export { activityHref, formatActivitySchedule, CATEGORY_META };
