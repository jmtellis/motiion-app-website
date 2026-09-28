import { cache } from "react";

import type { CalendarEvent } from "@/app/(buyer-app)/(paid)/events/actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type TalentScheduleFilter = "all" | "classes" | "sessions" | "events";

const ACTIVITY_COLUMNS =
  "id, title, type, activity_date, start_time, end_time, location, cover_image_url, status";

const ENROLLMENT_STATUSES = ["paid", "guest", "comped", "pending", "confirmed"] as const;

type ActivityRow = {
  id: string;
  title: string;
  type: string | null;
  activity_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  status: string | null;
};

function normalizeActivity(raw: unknown): ActivityRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.title !== "string") return null;
  return {
    id: row.id,
    title: row.title,
    type: typeof row.type === "string" ? row.type : null,
    activity_date: typeof row.activity_date === "string" ? row.activity_date : null,
    start_time: typeof row.start_time === "string" ? row.start_time : null,
    end_time: typeof row.end_time === "string" ? row.end_time : null,
    location: typeof row.location === "string" ? row.location : null,
    status: typeof row.status === "string" ? row.status : null,
  };
}

function toEventType(type: string | null): CalendarEvent["eventType"] {
  if (type === "class" || type === "session" || type === "event") return type;
  return "event";
}

function joinedActivities(rows: unknown[] | null): ActivityRow[] {
  return (rows ?? [])
    .map((row) => {
      const joined = (row as { activities?: unknown }).activities;
      const activity = Array.isArray(joined) ? joined[0] : joined;
      return normalizeActivity(activity);
    })
    .filter((activity): activity is ActivityRow => Boolean(activity));
}

/** Hosted, enrolled, featured, approved-join, and accepted-invite activities, including past dates. */
export const fetchTalentCalendarEvents = cache(async (userId: string): Promise<CalendarEvent[]> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const activitySelect = `activities ( ${ACTIVITY_COLUMNS} )`;
  const [
    { data: enrollments },
    { data: hosting },
    { data: featuredTalent },
    { data: joinRequests },
    { data: invites },
  ] = await Promise.all([
    supabase
      .from("enrollments")
      .select(`status, ${activitySelect}`)
      .eq("student_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("activities")
      .select(ACTIVITY_COLUMNS)
      .eq("creator_id", userId)
      .neq("status", "cancelled")
      .in("type", ["class", "session", "event"])
      .order("activity_date", { ascending: true, nullsFirst: false })
      .limit(200),
    supabase
      .from("activity_featured_talent")
      .select(`activity_id, ${activitySelect}`)
      .eq("talent_user_id", userId)
      .eq("status", "accepted")
      .limit(200),
    supabase
      .from("session_join_requests")
      .select(`status, ${activitySelect}`)
      .eq("requester_id", userId)
      .eq("status", "approved")
      .limit(200),
    supabase
      .from("activity_invites")
      .select(`response_status, ${activitySelect}`)
      .eq("invited_user_id", userId)
      .eq("response_status", "accepted")
      .eq("is_active", true)
      .limit(200),
  ]);

  const rows = [
    ...(hosting ?? [])
      .map((row) => normalizeActivity(row))
      .filter((activity): activity is ActivityRow => Boolean(activity)),
    ...joinedActivities(enrollments as unknown[] | null),
    ...joinedActivities(featuredTalent as unknown[] | null),
    ...joinedActivities(joinRequests as unknown[] | null),
    ...joinedActivities(invites as unknown[] | null),
  ];

  const seen = new Set<string>();
  const dated = rows.filter((row) => {
    if (!row.activity_date || row.status === "cancelled") return false;
    if (!["class", "session", "event"].includes(row.type ?? "")) return false;
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });

  const counts = new Map<string, number>();
  const ids = dated.map((row) => row.id);
  if (ids.length) {
    const { data: enrollmentCounts } = await supabase
      .from("enrollments")
      .select("activity_id")
      .in("activity_id", ids)
      .in("status", [...ENROLLMENT_STATUSES]);
    for (const row of (enrollmentCounts ?? []) as { activity_id: string }[]) {
      counts.set(row.activity_id, (counts.get(row.activity_id) ?? 0) + 1);
    }
  }

  return dated
    .map((row) => ({
      id: row.id,
      title: row.title,
      eventType: toEventType(row.type),
      date: row.activity_date as string,
      startTime: row.start_time ?? "09:00",
      endTime: row.end_time,
      location: row.location ?? "Location TBD",
      attendeeCount: counts.get(row.id) ?? 0,
    }))
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
});
