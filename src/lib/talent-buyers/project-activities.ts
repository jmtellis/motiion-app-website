"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { BuyerEventSummary } from "@/types/talent-buyer-dashboard";

export type ProjectActivitySummary = BuyerEventSummary & { attendeeCount: number };

export async function listProjectActivities(projectId: string): Promise<{
  activities: ProjectActivitySummary[];
  error?: string;
}> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { activities: [], error: "Supabase is not configured." };

  const { data, error } = await supabase
    .from("activities")
    .select("id, title, type, status, location, activity_date, start_time, cover_image_url")
    .eq("project_id", projectId)
    .neq("status", "cancelled")
    .order("activity_date", { ascending: true, nullsFirst: false })
    .limit(50);

  if (error) return { activities: [], error: error.message };

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

  const today = new Date().toISOString().slice(0, 10);

  return {
    activities: rows.map((row) => {
      const eventType = (["class", "session", "event"].includes(row.type as string)
        ? row.type
        : "event") as BuyerEventSummary["eventType"];
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
    }),
  };
}
