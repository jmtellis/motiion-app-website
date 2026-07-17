import type { SupabaseClient } from "@supabase/supabase-js";

import { createDefaultActivityDraft } from "@/lib/talent-buyers/activities/defaults";
import type {
  ActivityDraft,
  ActivityType,
  DraftEventDay,
  DraftTicketOption,
  TicketAccessMode,
} from "@/lib/talent-buyers/activities/types";

function asType(value: unknown): ActivityType {
  if (value === "class" || value === "session" || value === "event") return value;
  return "event";
}

function centsToDollars(cents: number | null | undefined): number {
  if (cents == null || !Number.isFinite(cents)) return 25;
  return Math.max(0.5, cents / 100);
}

function sliceTime(value: string | null | undefined): string {
  if (!value) return "18:00";
  return value.slice(0, 5);
}

export async function loadActivityDraft(
  supabase: SupabaseClient,
  activityId: string,
  userId: string,
): Promise<{ ok: true; draft: ActivityDraft } | { ok: false; error: string }> {
  const { data: row, error } = await supabase
    .from("activities")
    .select(
      `
      id, creator_id, type, title, description, location, cover_image_url,
      activity_date, start_time, end_date, end_time, max_attendees, is_private,
      require_payment, project_id, category, subcategory,
      price_amount_cents, max_guest_spots,
      class_what_you_will_learn, class_skill_level, class_focus, class_intensity,
      class_prerequisites, class_dress_code, class_equipment, class_cancellation_policy,
      session_level, session_vibe, session_rules, session_good_to_know,
      session_dress_code, session_equipment, session_cancellation_policy, session_tags,
      event_highlights, event_lineup, event_schedule_items,
      event_dress_code, event_arrival_notes, event_food_drinks_info,
      event_accessibility_info, event_late_entry_policy, event_cancellation_policy
    `,
    )
    .eq("id", activityId)
    .maybeSingle();

  if (error || !row) return { ok: false, error: "Activity not found." };
  if ((row as { creator_id: string }).creator_id !== userId) {
    return { ok: false, error: "You can only edit activities you created." };
  }

  const type = asType((row as { type: string }).type);
  const draft = createDefaultActivityDraft(type, (row as { project_id: string | null }).project_id);
  const r = row as Record<string, unknown>;

  draft.title = String(r.title ?? "");
  draft.description = String(r.description ?? "");
  draft.locationLabel = String(r.location ?? "");
  draft.coverImageUrl = String(r.cover_image_url ?? "");
  draft.activityDate = String(r.activity_date ?? draft.activityDate);
  draft.startTime = sliceTime(r.start_time as string | null);
  draft.endDate = String(r.end_date ?? draft.activityDate);
  draft.endTime = sliceTime(r.end_time as string | null);
  draft.maxAttendees = (r.max_attendees as number | null) ?? null;
  draft.isPublic = r.is_private !== true;
  draft.isPaid = r.require_payment === true;
  draft.category = String(r.category ?? "");
  draft.subcategory = String(r.subcategory ?? "");
  draft.priceAmount = centsToDollars(r.price_amount_cents as number | null);
  draft.maxGuestSpots = (r.max_guest_spots as number | null) ?? null;
  draft.whatYouWillLearn = Array.isArray(r.class_what_you_will_learn)
    ? (r.class_what_you_will_learn as string[])
    : [];
  draft.skillLevel = String(r.class_skill_level ?? "");
  draft.classFocus = String(r.class_focus ?? "");
  draft.intensity = String(r.class_intensity ?? "");
  draft.prerequisites = String(r.class_prerequisites ?? "");
  draft.dressCode = String(r.class_dress_code ?? r.session_dress_code ?? "");
  draft.whatToBring = String(r.class_equipment ?? r.session_equipment ?? "");
  draft.cancellationPolicy = String(
    r.class_cancellation_policy ?? r.session_cancellation_policy ?? "",
  );
  draft.sessionType = String(r.subcategory ?? "");
  draft.sessionLevel = String(r.session_level ?? "");
  draft.sessionVibe = String(r.session_vibe ?? "");
  draft.sessionRules = String(r.session_rules ?? "");
  draft.sessionGoodToKnow = String(r.session_good_to_know ?? "");
  draft.sessionTags = Array.isArray(r.session_tags) ? (r.session_tags as string[]) : [];
  draft.eventHighlights = Array.isArray(r.event_highlights) ? (r.event_highlights as string[]) : [];
  draft.eventLineup = Array.isArray(r.event_lineup) ? (r.event_lineup as string[]) : [];
  draft.eventDressCode = String(r.event_dress_code ?? "");
  draft.eventArrivalNotes = String(r.event_arrival_notes ?? "");
  draft.eventFoodDrinksInfo = String(r.event_food_drinks_info ?? "");
  draft.eventAccessibilityInfo = String(r.event_accessibility_info ?? "");
  draft.eventLateEntryPolicy = String(r.event_late_entry_policy ?? "");
  draft.eventCancellationPolicy = String(r.event_cancellation_policy ?? "");

  if (Array.isArray(r.event_schedule_items)) {
    draft.eventScheduleItems = (r.event_schedule_items as Record<string, unknown>[]).map(
      (item, index) => ({
        id: String(item.id ?? `sched_${index}`),
        timeLabel: String(item.time_label ?? item.timeLabel ?? ""),
        title: String(item.title ?? ""),
        detail: String(item.detail ?? ""),
      }),
    );
  }

  if (type === "event") {
    const { data: days } = await supabase
      .from("activity_event_days")
      .select("id,day_date,start_time,end_time,label,max_attendees,sort_order")
      .eq("activity_id", activityId)
      .order("sort_order", { ascending: true });

    draft.eventDays = ((days ?? []) as Record<string, unknown>[]).map(
      (day): DraftEventDay => ({
        id: String(day.id),
        dayDate: String(day.day_date),
        startTime: sliceTime(day.start_time as string | null),
        endTime: sliceTime(day.end_time as string | null),
        label: String(day.label ?? ""),
        maxAttendees: (day.max_attendees as number | null) ?? null,
      }),
    );

    const { data: tickets } = await supabase
      .from("activity_ticket_options")
      .select("id,label,amount_cents,access_mode,min_days,max_days,max_sales,sort_order")
      .eq("activity_id", activityId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    const ticketRows = (tickets ?? []) as Record<string, unknown>[];
    const ticketIds = ticketRows.map((t) => String(t.id));
    const dayIdsByTicket = new Map<string, string[]>();

    if (ticketIds.length) {
      const { data: links } = await supabase
        .from("activity_ticket_option_days")
        .select("ticket_option_id,event_day_id")
        .in("ticket_option_id", ticketIds);
      for (const link of (links ?? []) as { ticket_option_id: string; event_day_id: string }[]) {
        const list = dayIdsByTicket.get(link.ticket_option_id) ?? [];
        list.push(link.event_day_id);
        dayIdsByTicket.set(link.ticket_option_id, list);
      }
    }

    draft.ticketOptions = ticketRows.map(
      (ticket): DraftTicketOption => ({
        id: String(ticket.id),
        label: String(ticket.label ?? ""),
        priceAmount: centsToDollars(ticket.amount_cents as number),
        accessMode: (String(ticket.access_mode ?? "all_days") as TicketAccessMode) || "all_days",
        minDays: (ticket.min_days as number | null) ?? null,
        maxDays: (ticket.max_days as number | null) ?? null,
        maxSales: (ticket.max_sales as number | null) ?? null,
        includedEventDayIds: dayIdsByTicket.get(String(ticket.id)) ?? [],
      }),
    );

    if (!draft.eventDays.length) {
      draft.eventDays = [
        {
          id: crypto.randomUUID(),
          dayDate: draft.activityDate,
          startTime: draft.startTime,
          endTime: draft.endTime,
          label: "",
          maxAttendees: draft.maxAttendees,
        },
      ];
    }
  }

  const { data: collab } = await supabase
    .from("activity_collaborator_invites")
    .select("invited_user_id")
    .eq("activity_id", activityId)
    .eq("status", "pending");
  draft.collaboratorUserIds = ((collab ?? []) as { invited_user_id: string }[]).map(
    (row) => row.invited_user_id,
  );

  return { ok: true, draft };
}
