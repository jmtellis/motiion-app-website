"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { trackServerEvent } from "@/lib/analytics/track-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { BuyerEventSummary } from "@/types/talent-buyer-dashboard";

const createActivitySchema = z.object({
  title: z.string().trim().min(2, "Give the activity a title."),
  type: z.enum(["class", "session"]),
  description: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(200).optional(),
  activityDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  startTime: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, "Pick a start time."),
  maxAttendees: z.coerce.number().int().min(1).max(1000).optional(),
});

export type CreateActivityInput = z.input<typeof createActivitySchema>;

export async function createBuyerActivity(
  input: CreateActivityInput,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const parsed = createActivitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const values = parsed.data;
  const { data, error } = await supabase
    .from("activities")
    .insert({
      creator_id: user.id,
      title: values.title,
      type: values.type,
      description: values.description || null,
      location: values.location || null,
      activity_date: values.activityDate,
      start_time: values.startTime,
      max_attendees: values.maxAttendees ?? null,
      spots_remaining: values.maxAttendees ?? null,
      is_private: false,
      require_payment: false,
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[events] createBuyerActivity failed", error.message);
    return { ok: false, error: "Could not create the activity. Try again." };
  }

  await trackServerEvent("activity_created", {
    activity_id: data.id,
    activity_type: values.type,
  });

  revalidatePath("/events");
  return { ok: true, id: data.id };
}

type ActivityRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  location: string | null;
  activity_date: string | null;
  start_time: string | null;
};

export type HostedActivity = BuyerEventSummary & { attendeeCount: number };

/** Fetch the signed-in organizer's activities with attendee counts, split by date. */
export async function listHostedActivities(): Promise<{
  upcoming: HostedActivity[];
  past: HostedActivity[];
}> {
  const empty = { upcoming: [], past: [] };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return empty;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const { data: activities } = await supabase
    .from("activities")
    .select("id, title, type, status, location, activity_date, start_time")
    .eq("creator_id", user.id)
    .neq("status", "cancelled")
    .order("activity_date", { ascending: true, nullsFirst: false })
    .limit(60);

  const rows = (activities ?? []) as ActivityRow[];
  if (!rows.length) return empty;

  const counts = new Map<string, number>();
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("activity_id")
    .in(
      "activity_id",
      rows.map((row) => row.id),
    );

  for (const row of (enrollments ?? []) as { activity_id: string }[]) {
    counts.set(row.activity_id, (counts.get(row.activity_id) ?? 0) + 1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming: HostedActivity[] = [];
  const past: HostedActivity[] = [];

  for (const row of rows) {
    const isUpcoming = !row.activity_date || row.activity_date >= today;
    const summary: HostedActivity = {
      id: row.id,
      title: row.title,
      eventType: (["class", "session", "event"].includes(row.type)
        ? row.type
        : "event") as BuyerEventSummary["eventType"],
      status: row.status === "draft" ? "draft" : isUpcoming ? "upcoming" : "past",
      dateTime: row.activity_date
        ? `${row.activity_date}T${row.start_time ?? "00:00"}`
        : new Date().toISOString(),
      location: row.location ?? "Location TBD",
      attendeeCount: counts.get(row.id) ?? 0,
    };
    if (isUpcoming) {
      upcoming.push(summary);
    } else {
      past.push(summary);
    }
  }

  past.reverse();
  return { upcoming, past };
}
