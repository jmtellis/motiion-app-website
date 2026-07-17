"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fetchConnectAccountStatus } from "@/app/(buyer-app)/calendar/connect-actions";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createDefaultActivityDraft } from "@/lib/talent-buyers/activities/defaults";
import { loadActivityDraft } from "@/lib/talent-buyers/activities/load-activity-draft";
import {
  persistNewActivity,
  persistUpdatedActivity,
} from "@/lib/talent-buyers/activities/persist-activity";
import type { ActivityDraft } from "@/lib/talent-buyers/activities/types";
import type { BuyerEventSummary } from "@/types/talent-buyer-dashboard";

const createActivitySchema = z.object({
  title: z.string().trim().min(2, "Give the activity a title."),
  type: z.enum(["class", "session", "event"]),
  description: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(200).optional(),
  activityDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  startTime: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, "Pick a start time."),
  maxAttendees: z.coerce.number().int().min(1).max(1000).optional(),
  projectId: z.string().uuid().optional(),
});

export type CreateActivityInput = z.input<typeof createActivitySchema>;

function revalidateActivityPaths(activityId?: string, projectId?: string | null) {
  revalidatePath("/calendar");
  revalidatePath("/events");
  revalidatePath("/projects");
  if (activityId) {
    revalidatePath(`/calendar/${activityId}`);
    revalidatePath(`/calendar/${activityId}/edit`);
  }
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
  }
}

/** Legacy simple create — used only as fallback; prefer createActivityFromDraft. */
export async function createBuyerActivity(
  input: CreateActivityInput,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const parsed = createActivitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const values = parsed.data;
  const draft = createDefaultActivityDraft(values.type, values.projectId);
  draft.title = values.title;
  draft.description = values.description ?? "";
  draft.locationLabel = values.location ?? "";
  draft.activityDate = values.activityDate;
  draft.startTime = values.startTime;
  draft.endDate = values.activityDate;
  draft.maxAttendees = values.maxAttendees ?? (values.type === "session" ? 20 : null);
  draft.isPaid = false;
  if (values.type === "event") {
    draft.eventDays = [
      {
        id: crypto.randomUUID(),
        dayDate: values.activityDate,
        startTime: values.startTime,
        endTime: "21:00",
        label: "",
        maxAttendees: values.maxAttendees ?? null,
      },
    ];
  }

  return createActivityFromDraft(draft);
}

export async function createActivityFromDraft(
  draft: ActivityDraft,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const connect = await fetchConnectAccountStatus();
  const connectReady = Boolean(connect.status?.isReadyToAcceptPayments);

  const result = await persistNewActivity(supabase, user.id, draft, { connectReady });
  if (!result.ok) return result;

  await trackServerEvent("activity_created", {
    activity_id: result.id,
    activity_type: draft.type,
  });

  revalidateActivityPaths(result.id, draft.projectId);
  return { ok: true, id: result.id };
}

export async function updateActivityFromDraft(
  activityId: string,
  draft: ActivityDraft,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const connect = await fetchConnectAccountStatus();
  const connectReady = Boolean(connect.status?.isReadyToAcceptPayments);

  const result = await persistUpdatedActivity(supabase, user.id, activityId, draft, {
    connectReady,
  });
  if (!result.ok) return result;

  revalidateActivityPaths(result.id, draft.projectId);
  return { ok: true, id: result.id };
}

export async function getActivityDraftForEdit(
  activityId: string,
): Promise<{ ok: boolean; draft?: ActivityDraft; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  return loadActivityDraft(supabase, activityId, user.id);
}

type ActivityRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  location: string | null;
  activity_date: string | null;
  start_time: string | null;
  end_time: string | null;
  cover_image_url: string | null;
};

export type HostedActivity = BuyerEventSummary & { attendeeCount: number };

export type CalendarEvent = {
  id: string;
  title: string;
  eventType: BuyerEventSummary["eventType"];
  date: string;
  startTime: string;
  endTime: string | null;
  location: string;
  attendeeCount: number;
};

export type HostedActivitiesResult = {
  upcoming: HostedActivity[];
  past: HostedActivity[];
  calendarEvents: CalendarEvent[];
};

/** Fetch the signed-in organizer's activities with attendee counts, split by date. */
export async function listHostedActivities(): Promise<HostedActivitiesResult> {
  const empty: HostedActivitiesResult = { upcoming: [], past: [], calendarEvents: [] };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return empty;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const { data: activities } = await supabase
    .from("activities")
    .select(
      "id, title, type, status, location, activity_date, start_time, end_time, cover_image_url",
    )
    .eq("creator_id", user.id)
    .neq("status", "cancelled")
    .order("activity_date", { ascending: true, nullsFirst: false })
    .limit(200);

  const rows = (activities ?? []) as ActivityRow[];
  if (!rows.length) return empty;

  const counts = new Map<string, number>();
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("activity_id")
    .in(
      "activity_id",
      rows.map((row) => row.id),
    )
    .in("status", ["paid", "guest", "comped", "pending"]);

  for (const row of (enrollments ?? []) as { activity_id: string }[]) {
    counts.set(row.activity_id, (counts.get(row.activity_id) ?? 0) + 1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming: HostedActivity[] = [];
  const past: HostedActivity[] = [];
  const calendarEvents: CalendarEvent[] = [];

  for (const row of rows) {
    const isUpcoming = !row.activity_date || row.activity_date >= today;
    const eventType = (["class", "session", "event"].includes(row.type)
      ? row.type
      : "event") as BuyerEventSummary["eventType"];
    const attendeeCount = counts.get(row.id) ?? 0;

    const summary: HostedActivity = {
      id: row.id,
      title: row.title,
      eventType,
      status: row.status === "draft" ? "draft" : isUpcoming ? "upcoming" : "past",
      dateTime: row.activity_date
        ? `${row.activity_date}T${row.start_time ?? "00:00"}`
        : new Date().toISOString(),
      location: row.location ?? "Location TBD",
      attendeeCount,
      coverImageUrl: row.cover_image_url ?? null,
    };

    if (isUpcoming) {
      upcoming.push(summary);
    } else {
      past.push(summary);
    }

    if (row.activity_date) {
      calendarEvents.push({
        id: row.id,
        title: row.title,
        eventType,
        date: row.activity_date,
        startTime: row.start_time ?? "09:00",
        endTime: row.end_time,
        location: row.location ?? "Location TBD",
        attendeeCount,
      });
    }
  }

  past.reverse();
  return { upcoming, past, calendarEvents };
}
