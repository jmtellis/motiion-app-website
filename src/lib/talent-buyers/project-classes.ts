import { createServerSupabaseClient } from "@/lib/supabase/server";

const ENROLLED_STATUSES = new Set(["paid", "guest", "comped", "pending", "confirmed", "enrolled"]);
const WAITLIST_STATUSES = new Set(["waitlisted", "waitlist"]);

export type ProjectClassSession = {
  id: string;
  title: string;
  activityDate: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  coverImageUrl: string | null;
  status: "draft" | "upcoming" | "past";
  /** Listed on talent Discover / Find; unlisted sessions are invite-only. */
  isListed: boolean;
  capacity: number | null;
  enrolledCount: number;
  waitlistCount: number;
  checkedInCount: number;
  tierCount: number;
  priceCents: number | null;
  requiresPayment: boolean;
};

export type ProjectClassSeriesSummary = {
  sessionCount: number;
  upcomingCount: number;
  listedCount: number;
  enrolledTotal: number;
  capacityTotal: number | null;
  /** Checked-in / enrolled across past sessions, 0–1. Null until a session has run. */
  attendanceRate: number | null;
  nextSession: ProjectClassSession | null;
};

function sessionStatus(row: { status: string | null; activity_date: string | null }, today: string) {
  if (row.status === "draft") return "draft" as const;
  if (!row.activity_date || row.activity_date >= today) return "upcoming" as const;
  return "past" as const;
}

export async function listProjectClassSessions(projectId: string): Promise<ProjectClassSession[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("activities")
    .select(
      "id, title, status, location, activity_date, start_time, end_time, cover_image_url, is_private, max_attendees, price_amount_cents, require_payment",
    )
    .eq("project_id", projectId)
    .eq("type", "class")
    .neq("status", "cancelled")
    .order("activity_date", { ascending: true, nullsFirst: false })
    .order("start_time", { ascending: true, nullsFirst: false })
    .limit(200);

  if (error || !data?.length) return [];

  const ids = data.map((row) => row.id as string);
  const [enrollments, checkIns, tiers] = await Promise.all([
    supabase.from("enrollments").select("activity_id, status").in("activity_id", ids),
    supabase.from("activity_check_ins").select("activity_id, user_id").in("activity_id", ids),
    supabase
      .from("activity_ticket_options")
      .select("activity_id")
      .in("activity_id", ids)
      .eq("is_active", true),
  ]);

  const enrolled = new Map<string, number>();
  const waitlist = new Map<string, number>();
  for (const row of enrollments.data ?? []) {
    const activityId = row.activity_id as string;
    const status = String(row.status ?? "").toLowerCase();
    if (ENROLLED_STATUSES.has(status)) enrolled.set(activityId, (enrolled.get(activityId) ?? 0) + 1);
    else if (WAITLIST_STATUSES.has(status)) waitlist.set(activityId, (waitlist.get(activityId) ?? 0) + 1);
  }

  const checkedIn = new Map<string, Set<string>>();
  for (const row of checkIns.data ?? []) {
    const activityId = row.activity_id as string;
    const set = checkedIn.get(activityId) ?? new Set<string>();
    set.add(row.user_id as string);
    checkedIn.set(activityId, set);
  }

  const tierCounts = new Map<string, number>();
  for (const row of tiers.data ?? []) {
    const activityId = row.activity_id as string;
    tierCounts.set(activityId, (tierCounts.get(activityId) ?? 0) + 1);
  }

  const today = new Date().toISOString().slice(0, 10);

  return data.map((row) => {
    const id = row.id as string;
    return {
      id,
      title: (row.title as string | null) || "Untitled session",
      activityDate: (row.activity_date as string | null) ?? null,
      startTime: (row.start_time as string | null) ?? null,
      endTime: (row.end_time as string | null) ?? null,
      location: (row.location as string | null) ?? null,
      coverImageUrl: (row.cover_image_url as string | null) ?? null,
      status: sessionStatus(
        { status: row.status as string | null, activity_date: row.activity_date as string | null },
        today,
      ),
      isListed: row.is_private !== true,
      capacity: (row.max_attendees as number | null) ?? null,
      enrolledCount: enrolled.get(id) ?? 0,
      waitlistCount: waitlist.get(id) ?? 0,
      checkedInCount: checkedIn.get(id)?.size ?? 0,
      tierCount: tierCounts.get(id) ?? 0,
      priceCents: (row.price_amount_cents as number | null) ?? null,
      requiresPayment: row.require_payment === true,
    };
  });
}

export function summarizeClassSeries(sessions: ProjectClassSession[]): ProjectClassSeriesSummary {
  const upcoming = sessions.filter((session) => session.status === "upcoming");
  const past = sessions.filter((session) => session.status === "past");
  const pastEnrolled = past.reduce((total, session) => total + session.enrolledCount, 0);
  const pastCheckedIn = past.reduce((total, session) => total + session.checkedInCount, 0);
  const capacities = sessions.map((session) => session.capacity);

  return {
    sessionCount: sessions.length,
    upcomingCount: upcoming.length,
    listedCount: sessions.filter((session) => session.isListed && session.status !== "draft").length,
    enrolledTotal: sessions.reduce((total, session) => total + session.enrolledCount, 0),
    capacityTotal: capacities.every((value) => typeof value === "number")
      ? capacities.reduce<number>((total, value) => total + (value ?? 0), 0)
      : null,
    attendanceRate: pastEnrolled > 0 ? Math.min(1, pastCheckedIn / pastEnrolled) : null,
    nextSession: upcoming[0] ?? null,
  };
}
