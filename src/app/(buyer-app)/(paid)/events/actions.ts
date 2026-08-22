"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fetchConnectAccountStatus } from "@/app/(buyer-app)/(paid)/calendar/connect-actions";
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
  // Public only when a venue is present (matches iOS discoverability rules).
  draft.isPublic = Boolean(draft.locationLabel.trim());

  if (values.type === "event") {
    draft.subcategory = "Other";
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
  } else if (values.type === "class") {
    draft.category = "Industry";
    draft.subcategory = "Workshop";
    draft.genres = ["Contemporary"];
    draft.whatYouWillLearn = ["Core technique and performance notes"];
    draft.skillLevel = "Open Level";
    draft.classFocus = "Technique";
  } else {
    draft.sessionType = "Other";
    draft.sessionLevel = "Open";
    draft.sessionVibe = "Chill";
    draft.genres = ["Contemporary"];
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
  if (draft.type === "class" || draft.type === "session") {
    await trackServerEvent(draft.type === "class" ? "class_created" : "session_created", {
      activity_id: result.id,
      activity_type: draft.type,
    });
  }

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
  require_payment?: boolean | null;
};

export type ActivityHubItem = BuyerEventSummary & {
  attendeeCount: number;
  participation: "hosting" | "attending";
  requirePayment?: boolean;
  dayCount?: number;
};

/** @deprecated Prefer ActivityHubItem */
export type HostedActivity = ActivityHubItem;

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
  upcoming: ActivityHubItem[];
  past: ActivityHubItem[];
  calendarEvents: CalendarEvent[];
};

function toEventType(type: string): BuyerEventSummary["eventType"] {
  return (["class", "session", "event"].includes(type) ? type : "event") as BuyerEventSummary["eventType"];
}

function rowToHubItem(
  row: ActivityRow,
  opts: {
    attendeeCount: number;
    participation: "hosting" | "attending";
    today: string;
    dayCount?: number;
  },
): ActivityHubItem {
  const isUpcoming = !row.activity_date || row.activity_date >= opts.today;
  return {
    id: row.id,
    title: row.title,
    eventType: toEventType(row.type),
    status: row.status === "draft" ? "draft" : isUpcoming ? "upcoming" : "past",
    dateTime: row.activity_date
      ? `${row.activity_date}T${row.start_time ?? "00:00"}`
      : new Date().toISOString(),
    location: row.location ?? "Location TBD",
    attendeeCount: opts.attendeeCount,
    coverImageUrl: row.cover_image_url ?? null,
    participation: opts.participation,
    requirePayment: row.require_payment === true,
    dayCount: opts.dayCount,
  };
}

/** Fetch activities the signed-in user hosts or is attending, split by date. */
export async function listHostedActivities(): Promise<HostedActivitiesResult> {
  const empty: HostedActivitiesResult = { upcoming: [], past: [], calendarEvents: [] };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return empty;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const today = new Date().toISOString().slice(0, 10);

  const { data: hostedRows } = await supabase
    .from("activities")
    .select(
      "id, title, type, status, location, activity_date, start_time, end_time, cover_image_url, require_payment",
    )
    .eq("creator_id", user.id)
    .neq("status", "cancelled")
    .order("activity_date", { ascending: true, nullsFirst: false })
    .limit(200);

  const hosted = (hostedRows ?? []) as ActivityRow[];

  const { data: enrollmentRows } = await supabase
    .from("enrollments")
    .select("activity_id")
    .eq("user_id", user.id)
    .in("status", ["paid", "guest", "comped", "pending", "confirmed"])
    .limit(200);

  const attendingIds = [
    ...new Set(
      ((enrollmentRows ?? []) as { activity_id: string }[])
        .map((row) => row.activity_id)
        .filter((id) => !hosted.some((activity) => activity.id === id)),
    ),
  ];

  let attending: ActivityRow[] = [];
  if (attendingIds.length) {
    const { data: attendingRows } = await supabase
      .from("activities")
      .select(
        "id, title, type, status, location, activity_date, start_time, end_time, cover_image_url, require_payment",
      )
      .in("id", attendingIds)
      .neq("status", "cancelled")
      .order("activity_date", { ascending: true, nullsFirst: false });
    attending = (attendingRows ?? []) as ActivityRow[];
  }

  const allIds = [...hosted, ...attending].map((row) => row.id);
  const counts = new Map<string, number>();
  const dayCounts = new Map<string, number>();
  if (allIds.length) {
    const [{ data: enrollmentCounts }, { data: eventDayRows }] = await Promise.all([
      supabase
        .from("enrollments")
        .select("activity_id")
        .in("activity_id", allIds)
        .in("status", ["paid", "guest", "comped", "pending", "confirmed"]),
      supabase.from("activity_event_days").select("activity_id").in("activity_id", allIds),
    ]);

    for (const row of (enrollmentCounts ?? []) as { activity_id: string }[]) {
      counts.set(row.activity_id, (counts.get(row.activity_id) ?? 0) + 1);
    }
    for (const row of (eventDayRows ?? []) as { activity_id: string }[]) {
      dayCounts.set(row.activity_id, (dayCounts.get(row.activity_id) ?? 0) + 1);
    }
  }

  const upcoming: ActivityHubItem[] = [];
  const past: ActivityHubItem[] = [];
  const calendarEvents: CalendarEvent[] = [];
  const seen = new Set<string>();

  function pushRow(row: ActivityRow, participation: "hosting" | "attending") {
    if (seen.has(row.id)) return;
    seen.add(row.id);
    const item = rowToHubItem(row, {
      attendeeCount: counts.get(row.id) ?? 0,
      participation,
      today,
      dayCount: dayCounts.get(row.id),
    });
    if (item.status === "past") past.push(item);
    else upcoming.push(item);

    if (row.activity_date) {
      calendarEvents.push({
        id: row.id,
        title: row.title,
        eventType: item.eventType,
        date: row.activity_date,
        startTime: row.start_time ?? "09:00",
        endTime: row.end_time,
        location: row.location ?? "Location TBD",
        attendeeCount: item.attendeeCount,
      });
    }
  }

  for (const row of hosted) pushRow(row, "hosting");
  for (const row of attending) pushRow(row, "attending");

  upcoming.sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  past.sort((a, b) => b.dateTime.localeCompare(a.dateTime));
  calendarEvents.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  return { upcoming, past, calendarEvents };
}

export type ExploreActivityItem = BuyerEventSummary & {
  attendeeCount: number;
};

/** Public upcoming activities available to discover on the platform. */
export async function listOpenExploreActivities(): Promise<{
  items: ExploreActivityItem[];
  viewerCity: string | null;
}> {
  const empty = { items: [] as ExploreActivityItem[], viewerCity: null as string | null };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return empty;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase
      .from("activities")
      .select(
        "id, title, type, status, location, activity_date, start_time, end_time, cover_image_url",
      )
      .eq("status", "active")
      .eq("is_private", false)
      .gte("activity_date", today)
      .order("activity_date", { ascending: true, nullsFirst: false })
      .limit(120),
    supabase
      .from("profiles")
      .select("working_locations")
      .eq("user_id", user.id)
      .maybeSingle<{ working_locations: unknown }>(),
  ]);

  const activityRows = (rows ?? []) as ActivityRow[];
  const ids = activityRows.map((row) => row.id);
  const counts = new Map<string, number>();

  if (ids.length) {
    const { data: enrollmentCounts } = await supabase
      .from("enrollments")
      .select("activity_id")
      .in("activity_id", ids)
      .in("status", ["paid", "guest", "comped", "pending", "confirmed"]);

    for (const row of (enrollmentCounts ?? []) as { activity_id: string }[]) {
      counts.set(row.activity_id, (counts.get(row.activity_id) ?? 0) + 1);
    }
  }

  let viewerCity: string | null = null;
  const workingLocations = profile?.working_locations;
  if (Array.isArray(workingLocations) && workingLocations[0]) {
    const loc = workingLocations[0];
    if (typeof loc === "string") {
      viewerCity = loc.split(",")[0]?.trim() || null;
    } else if (typeof loc === "object" && loc && "city" in loc) {
      const city = (loc as { city?: string }).city;
      viewerCity = typeof city === "string" && city.trim() ? city.trim() : null;
    }
  }

  const items: ExploreActivityItem[] = activityRows.map((row) => {
    const hub = rowToHubItem(row, {
      attendeeCount: counts.get(row.id) ?? 0,
      participation: "attending",
      today,
    });
    return {
      id: hub.id,
      title: hub.title,
      eventType: hub.eventType,
      status: hub.status,
      dateTime: hub.dateTime,
      location: hub.location,
      coverImageUrl: hub.coverImageUrl,
      attendeeCount: hub.attendeeCount,
    };
  });

  return { items, viewerCity };
}
