import { cache } from "react";

import { fetchMatchedOpportunities } from "@/lib/app/opportunities";
import { supabaseRpc } from "@/lib/supabase/rpc";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { HomeFeedData, HomePendingRequest, UpcomingActivity } from "@/types/app";

type ActivitySummary = {
  id: string;
  title: string;
  type: string | null;
  activity_date: string | null;
  start_time: string | null;
  cover_image_url: string | null;
  status: string | null;
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


function formatActivitySchedule(row: Pick<UpcomingActivity, "activity_date" | "start_time">) {
  const parts = [row.activity_date, row.start_time?.slice(0, 5)].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Schedule TBD";
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

async function fetchUpcomingActivities(userId: string): Promise<UpcomingActivity[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const [{ data: enrollments }, { data: hosting }] = await Promise.all([
    supabase
      .from("enrollments")
      .select(
        "status, activities ( id, title, type, activity_date, start_time, cover_image_url, status )",
      )
      .eq("student_id", userId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("activities")
      .select("id, title, type, activity_date, start_time, cover_image_url, status")
      .eq("creator_id", userId)
      .neq("status", "cancelled")
      .order("activity_date", { ascending: true, nullsFirst: false })
      .limit(8),
  ]);

  const attending = (enrollments ?? [])
    .map((row) => {
      const joined = (row as { activities?: unknown }).activities;
      const activity = Array.isArray(joined) ? joined[0] : joined;
      return normalizeJoinedActivity(activity);
    })
    .filter((activity): activity is ActivitySummary => Boolean(activity))
    .map((activity) => toUpcoming(activity, "attending"));

  const hosted = (hosting ?? [])
    .map((row) => normalizeJoinedActivity(row))
    .filter((activity): activity is ActivitySummary => Boolean(activity))
    .map((activity) => toUpcoming(activity, "hosting"));

  const merged = [...hosted, ...attending];
  const seen = new Set<string>();

  return merged.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export const fetchHomeFeed = cache(async (userId: string): Promise<HomeFeedData> => {
  const [{ data: pendingRequests, error }, upcomingActivities, matchedOpportunities] = await Promise.all([
    supabaseRpc<HomePendingRequest[]>("list_pending_requests", { p_limit: 12 }),
    fetchUpcomingActivities(userId),
    fetchMatchedOpportunities(userId),
  ]);

  return {
    pendingRequests: error ? [] : (pendingRequests ?? []),
    upcomingActivities,
    matchedOpportunities,
  };
});

export { formatActivitySchedule };
