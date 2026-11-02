import { cache } from "react";

import type { CalendarEvent } from "@/app/(buyer-app)/(paid)/events/actions";
import { buildCalendarActivityEvents, buildConfirmedProjectEvents, type CalendarActivityDay, type CalendarConfirmation } from "@/lib/app/calendar-events";
import { readPagedRows } from "@/lib/supabase/read-pages";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type TalentScheduleFilter = "all" | "classes" | "sessions" | "events";

const ACTIVITY_COLUMNS =
  "id, title, type, activity_date, start_time, end_time, location, cover_image_url, status";

const ENROLLMENT_STATUSES = ["paid", "guest", "comped"] as const;

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
export const fetchTalentCalendarEvents = cache(async (userId: string): Promise<{ events: CalendarEvent[]; error: string | null }> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { events: [], error: "Calendar is temporarily unavailable. Please try again." };

  const activitySelect = `activities ( ${ACTIVITY_COLUMNS} )`;
  const [
    enrollmentResult,
    hostingResult,
    featuredResult,
    joinResult,
    inviteResult,
    savedResult,
    collaboratorResult,
    confirmationsResult,
  ] = await Promise.all([
    readPagedRows((from, to) => supabase.from("enrollments").select(`id, activity_id, status, ${activitySelect}`)
      .eq("student_id", userId).in("status", [...ENROLLMENT_STATUSES]).order("id").range(from, to)),
    readPagedRows((from, to) => supabase.from("activities").select(ACTIVITY_COLUMNS)
      .eq("creator_id", userId).eq("status", "active").in("type", ["class", "session", "event"])
      .order("activity_date", { ascending: true, nullsFirst: false }).order("id").range(from, to)),
    readPagedRows((from, to) => supabase.from("activity_featured_talent").select(`activity_id, ${activitySelect}`)
      .eq("talent_user_id", userId).eq("status", "accepted").order("activity_id").range(from, to)),
    readPagedRows((from, to) => supabase.from("session_join_requests").select(`id, activity_id, status, ${activitySelect}`)
      .eq("requester_id", userId).eq("status", "approved").order("id").range(from, to)),
    readPagedRows((from, to) => supabase.from("activity_invites").select(`response_status, ${activitySelect}`)
      .eq("invited_user_id", userId).eq("response_status", "accepted").eq("is_active", true).order("id").range(from, to)),
    readPagedRows((from, to) => supabase.from("activity_calendar_items").select(activitySelect)
      .eq("user_id", userId).order("activity_id").range(from, to)),
    readPagedRows((from, to) => supabase.from("activity_collaborators").select(activitySelect)
      .eq("user_id", userId).order("activity_id").range(from, to)),
    readPagedRows((from, to) => supabase.rpc("list_talent_bookings", { p_bucket: "all" }).order("id").range(from, to)),
  ]);
  const results = [enrollmentResult, hostingResult, featuredResult, joinResult, inviteResult, savedResult, collaboratorResult, confirmationsResult];
  const errors: unknown[] = results.filter((result) => result.error);
  const enrollments = enrollmentResult.data;
  const hosting = hostingResult.data;
  const featuredTalent = featuredResult.data;
  const joinRequests = joinResult.data;
  const invites = inviteResult.data;

  const rows = [
    ...(hosting ?? [])
      .map((row) => normalizeActivity(row))
      .filter((activity): activity is ActivityRow => Boolean(activity)),
    ...joinedActivities(enrollments as unknown[] | null),
    ...joinedActivities(featuredTalent as unknown[] | null),
    ...joinedActivities(joinRequests as unknown[] | null),
    ...joinedActivities(invites as unknown[] | null),
    ...joinedActivities(savedResult.data as unknown[] | null),
    ...joinedActivities(collaboratorResult.data as unknown[] | null),
  ];

  const seen = new Set<string>();
  const dated = rows.filter((row) => {
    if (row.status !== "active") return false;
    if (!["class", "session", "event"].includes(row.type ?? "")) return false;
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });

  const confirmationRows = (confirmationsResult.data ?? []) as CalendarConfirmation[];
  const confirmationProjectIds = [...new Set(confirmationRows.flatMap((row) => row.project_id ? [row.project_id] : []))];
  const counts = new Map<string, number>();
  const ids = dated.map((row) => row.id);
  // Attendee rows are RLS-filtered for ordinary attendees; never present a partial count as a total.
  const ownedIds = (hosting ?? []).map((row) => row.id);
  const enrollmentIds = (enrollments ?? []).map((row) => row.id);
  const admittedDayIds = new Map<string, Set<string>>();
  let days: CalendarActivityDay[] = [];
  let countsAvailable = false;
  if (ids.length || confirmationProjectIds.length) {
    const [countResult, dayResult, projectResult, admissionResult] = await Promise.all([
      ownedIds.length ? readPagedRows((from,to) => supabase.from("enrollments").select("activity_id").in("activity_id", ownedIds)
        .in("status", [...ENROLLMENT_STATUSES]).order("id").range(from,to)) : Promise.resolve({ data: [], error: null }),
      ids.length ? readPagedRows((from,to) => supabase.from("activity_event_days")
        .select("id, activity_id, day_date, start_time, end_time").in("activity_id", ids).order("id").range(from,to)) : Promise.resolve({ data: [], error: null }),
      confirmationProjectIds.length ? supabase.from("projects").select("id,title").in("id", confirmationProjectIds) : Promise.resolve({ data: [], error: null }),
      enrollmentIds.length ? readPagedRows((from, to) => supabase.from("enrollment_event_day_entitlements").select("id,enrollment_id,event_day_id").in("enrollment_id", enrollmentIds).eq("status", "active").order("id").range(from, to)) : Promise.resolve({ data: [], error: null }),
    ]);
    countsAvailable = !countResult.error;
    if (countResult.error) errors.push(countResult);
    if (dayResult.error) errors.push(dayResult);
    if (projectResult.error) errors.push(projectResult);
    const projectTitles = new Map((projectResult.data ?? []).map((project) => [project.id, project.title]));
    for (const row of confirmationRows) row.projectTitle = row.project_id ? projectTitles.get(row.project_id) : null;
    for (const row of (countResult.data ?? []) as { activity_id: string }[]) {
      counts.set(row.activity_id, (counts.get(row.activity_id) ?? 0) + 1);
    }
    days = (dayResult.data ?? []) as CalendarActivityDay[];
    if (admissionResult.error) errors.push(admissionResult);
    const programIds = new Set(days.map((day) => day.activity_id));
    const managedIds = new Set([...ownedIds, ...joinedActivities(collaboratorResult.data as unknown[]).map((activity) => activity.id), ...joinedActivities(featuredTalent as unknown[]).map((activity) => activity.id)]);
    const daysByEnrollment = new Map<string, Set<string>>();
    for (const row of admissionResult.data ?? []) {
      const dayIds = daysByEnrollment.get(row.enrollment_id) ?? new Set<string>();
      dayIds.add(row.event_day_id);
      daysByEnrollment.set(row.enrollment_id, dayIds);
    }
    for (const enrollment of enrollments ?? []) {
      // Hosts/collaborators retain the whole program; attendees see only their admission.
      if (!managedIds.has(enrollment.activity_id) && (programIds.has(enrollment.activity_id) || dayResult.error)) {
        admittedDayIds.set(enrollment.activity_id, daysByEnrollment.get(enrollment.id) ?? new Set());
      }
    }
  }

  if (countsAvailable) for (const id of ownedIds) if (!counts.has(id)) counts.set(id, 0);

  return {
    events: [...buildCalendarActivityEvents(dated, days, counts, admittedDayIds), ...buildConfirmedProjectEvents(confirmationRows)].sort((a,b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id)),
    error: errors.length ? "Some calendar details could not be loaded. Retry to see your complete schedule." : null,
  };
});
