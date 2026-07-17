import type { SupabaseClient } from "@supabase/supabase-js";

import {
  dollarsToCents,
  locationDisplayString,
  syncScheduleFromEventDays,
} from "@/lib/talent-buyers/activities/defaults";
import type { ActivityDraft, DraftTicketOption } from "@/lib/talent-buyers/activities/types";
import { validateActivityDraft } from "@/lib/talent-buyers/activities/validate-draft";

function normalizeTime(value: string): string {
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  return trimmed;
}

function trimOrNull(value: string): string | null {
  const t = value.trim();
  return t.length ? t : null;
}

function normalizeStringList(values: string[], max = 10): string[] {
  const out: string[] = [];
  for (const raw of values) {
    const t = raw.trim();
    if (!t || out.includes(t)) continue;
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function legacyPricingTiers(options: DraftTicketOption[]) {
  return options
    .filter((t) => t.label.trim() && t.priceAmount >= 0.5)
    .map((t) => ({
      id: t.id,
      label: t.label.trim(),
      amount_cents: dollarsToCents(t.priceAmount),
    }));
}

async function replaceEventDays(
  supabase: SupabaseClient,
  activityId: string,
  draft: ActivityDraft,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error: deleteError } = await supabase
    .from("activity_event_days")
    .delete()
    .eq("activity_id", activityId);
  if (deleteError) {
    console.error("[activities] replaceEventDays delete", deleteError.message);
    return { ok: false, error: "Could not save event days." };
  }

  if (draft.eventDays.length === 0) return { ok: true };

  const rows = draft.eventDays.map((day, index) => ({
    id: day.id,
    activity_id: activityId,
    day_date: day.dayDate,
    start_time: normalizeTime(day.startTime),
    end_time: normalizeTime(day.endTime),
    label: trimOrNull(day.label),
    sort_order: index,
    max_attendees: day.maxAttendees,
    spots_remaining: day.maxAttendees,
  }));

  const { error } = await supabase.from("activity_event_days").insert(rows);
  if (error) {
    console.error("[activities] replaceEventDays insert", error.message);
    return { ok: false, error: "Could not save event days." };
  }
  return { ok: true };
}

async function replaceTicketOptions(
  supabase: SupabaseClient,
  activityId: string,
  draft: ActivityDraft,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existing } = await supabase
    .from("activity_ticket_options")
    .select("id")
    .eq("activity_id", activityId);

  const existingIds = ((existing ?? []) as { id: string }[]).map((r) => r.id);
  if (existingIds.length) {
    await supabase.from("activity_ticket_option_days").delete().in("ticket_option_id", existingIds);
  }

  const { error: deleteError } = await supabase
    .from("activity_ticket_options")
    .delete()
    .eq("activity_id", activityId);
  if (deleteError) {
    console.error("[activities] replaceTicketOptions delete", deleteError.message);
    return { ok: false, error: "Could not save ticket types." };
  }

  if (!draft.isPaid) return { ok: true };

  const options = draft.ticketOptions.filter(
    (t) => t.label.trim().length > 0 && t.priceAmount >= 0.5,
  );
  if (!options.length) return { ok: true };

  const optionRows = options.map((ticket, index) => ({
    id: ticket.id,
    activity_id: activityId,
    label: ticket.label.trim(),
    amount_cents: dollarsToCents(ticket.priceAmount),
    currency: "USD",
    access_mode: ticket.accessMode,
    min_days: ticket.accessMode === "select_days" ? (ticket.minDays ?? 1) : null,
    max_days: ticket.accessMode === "select_days" ? (ticket.maxDays ?? ticket.minDays ?? 1) : null,
    max_sales: ticket.maxSales,
    sort_order: index,
    is_active: true,
  }));

  const { error } = await supabase.from("activity_ticket_options").insert(optionRows);
  if (error) {
    console.error("[activities] replaceTicketOptions insert", error.message);
    return { ok: false, error: "Could not save ticket types." };
  }

  const dayLinks = options.flatMap((ticket) =>
    ticket.accessMode === "fixed_days"
      ? ticket.includedEventDayIds.map((eventDayId) => ({
          ticket_option_id: ticket.id,
          event_day_id: eventDayId,
        }))
      : [],
  );

  if (dayLinks.length) {
    const { error: linkError } = await supabase.from("activity_ticket_option_days").insert(dayLinks);
    if (linkError) {
      console.error("[activities] ticket option days", linkError.message);
      return { ok: false, error: "Could not save ticket day access." };
    }
  }

  return { ok: true };
}

async function syncCollaborators(
  supabase: SupabaseClient,
  activityId: string,
  userIds: string[],
  _inviterId: string,
): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))].slice(0, 5);
  const { error } = await supabase.rpc("sync_activity_collaborator_invites", {
    p_activity_id: activityId,
    p_invited_user_ids: unique,
  });
  if (error) {
    console.warn("[activities] collaborator sync skipped", error.message);
  }
}

async function createShowcaseRootJob(
  supabase: SupabaseClient,
  userId: string,
  draft: ActivityDraft,
): Promise<{ ok: true; jobId: string } | { ok: false; error: string }> {
  const synced = syncScheduleFromEventDays(draft);
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      poster_id: userId,
      title: draft.title.trim(),
      job_type: "showcase",
      description: trimOrNull(draft.description),
      start_date: synced.activityDate || null,
      end_date: synced.endDate || synced.activityDate || null,
      location: locationDisplayString(draft) || null,
      cover_image_url: trimOrNull(draft.coverImageUrl),
      status: "upcoming",
      is_private: true,
      final_select_ids: [],
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[activities] createShowcaseRootJob", error?.message);
    return { ok: false, error: "Could not create the event workspace." };
  }
  return { ok: true, jobId: data.id as string };
}

export async function persistNewActivity(
  supabase: SupabaseClient,
  userId: string,
  sourceDraft: ActivityDraft,
  options: { connectReady: boolean },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  let draft = syncScheduleFromEventDays(sourceDraft);
  if (draft.type === "session") {
    draft = { ...draft, isPaid: false };
  }

  const validationError = validateActivityDraft(draft);
  if (validationError) return { ok: false, error: validationError };

  const requirePayment =
    draft.type !== "session" &&
    draft.isPaid &&
    (draft.type === "class"
      ? draft.priceAmount >= 0.5
      : draft.ticketOptions.some((t) => t.label.trim() && t.priceAmount >= 0.5));

  if (requirePayment && !options.connectReady) {
    return {
      ok: false,
      error: "Finish Stripe payment setup before publishing a paid activity.",
    };
  }

  const location = locationDisplayString(draft) || null;
  let rootJobId: string | null = null;

  if (draft.type === "event") {
    const jobResult = await createShowcaseRootJob(supabase, userId, draft);
    if (!jobResult.ok) return jobResult;
    rootJobId = jobResult.jobId;
  }

  const baseRow: Record<string, unknown> = {
    creator_id: userId,
    title: draft.title.trim(),
    type: draft.type,
    description: trimOrNull(draft.description),
    location,
    cover_image_url: trimOrNull(draft.coverImageUrl),
    activity_date: draft.activityDate || null,
    start_time: draft.startTime ? normalizeTime(draft.startTime) : null,
    end_date: draft.endDate || draft.activityDate || null,
    end_time: draft.endTime ? normalizeTime(draft.endTime) : null,
    max_attendees: draft.maxAttendees,
    spots_remaining: draft.maxAttendees,
    is_private: !draft.isPublic,
    require_payment: requirePayment,
    status: "active",
    project_id: draft.projectId,
  };

  if (draft.type === "event") {
    Object.assign(baseRow, {
      root_job_id: rootJobId,
      category: trimOrNull(draft.category),
      subcategory: trimOrNull(draft.subcategory),
      price_amount_cents: null,
      price_currency: requirePayment ? "usd" : null,
      pricing_tiers: requirePayment ? legacyPricingTiers(draft.ticketOptions) : null,
      event_highlights: normalizeStringList(draft.eventHighlights, 5),
      event_lineup: normalizeStringList(draft.eventLineup, 20),
      event_schedule_items: draft.eventScheduleItems
        .filter((item) => item.title.trim())
        .map((item) => ({
          id: item.id,
          time_label: item.timeLabel.trim(),
          title: item.title.trim(),
          detail: item.detail.trim(),
        })),
      event_dress_code: trimOrNull(draft.eventDressCode),
      event_arrival_notes: trimOrNull(draft.eventArrivalNotes),
      event_food_drinks_info: trimOrNull(draft.eventFoodDrinksInfo),
      event_accessibility_info: trimOrNull(draft.eventAccessibilityInfo),
      event_late_entry_policy: trimOrNull(draft.eventLateEntryPolicy),
      event_cancellation_policy: trimOrNull(draft.eventCancellationPolicy),
    });
  } else if (draft.type === "class") {
    Object.assign(baseRow, {
      category: trimOrNull(draft.category),
      subcategory: trimOrNull(draft.subcategory),
      price_amount_cents: requirePayment ? dollarsToCents(draft.priceAmount) : null,
      price_currency: requirePayment ? "usd" : null,
      max_guest_spots: draft.maxGuestSpots,
      class_what_you_will_learn: normalizeStringList(draft.whatYouWillLearn, 5),
      class_skill_level: trimOrNull(draft.skillLevel),
      class_focus: trimOrNull(draft.classFocus),
      class_intensity: trimOrNull(draft.intensity),
      class_prerequisites: trimOrNull(draft.prerequisites),
      class_dress_code: trimOrNull(draft.dressCode),
      class_equipment: trimOrNull(draft.whatToBring),
      class_cancellation_policy: trimOrNull(draft.cancellationPolicy),
    });
  } else {
    Object.assign(baseRow, {
      subcategory: trimOrNull(draft.sessionType),
      session_level: trimOrNull(draft.sessionLevel),
      session_vibe: trimOrNull(draft.sessionVibe),
      session_rules: trimOrNull(draft.sessionRules),
      session_good_to_know: trimOrNull(draft.sessionGoodToKnow),
      session_dress_code: trimOrNull(draft.dressCode),
      session_equipment: trimOrNull(draft.whatToBring),
      session_cancellation_policy: trimOrNull(draft.cancellationPolicy),
      session_tags: normalizeStringList(draft.sessionTags, 10),
      price_amount_cents: null,
      require_payment: false,
    });
  }

  const { data, error } = await supabase.from("activities").insert(baseRow).select("id").single();
  if (error || !data) {
    console.error("[activities] insert activity", error?.message);
    return { ok: false, error: "Could not create the activity. Try again." };
  }

  const activityId = data.id as string;

  if (draft.type === "class" && draft.genres.length) {
    await supabase.from("activity_tags").insert(
      normalizeStringList(draft.genres, 5).map((tag) => ({
        activity_id: activityId,
        tag,
      })),
    );
  }

  if (draft.type === "event") {
    const daysResult = await replaceEventDays(supabase, activityId, draft);
    if (!daysResult.ok) return daysResult;
    const ticketsResult = await replaceTicketOptions(supabase, activityId, draft);
    if (!ticketsResult.ok) return ticketsResult;
  }

  if (draft.collaboratorUserIds.length) {
    await syncCollaborators(supabase, activityId, draft.collaboratorUserIds, userId);
  }

  return { ok: true, id: activityId };
}

export async function persistUpdatedActivity(
  supabase: SupabaseClient,
  userId: string,
  activityId: string,
  sourceDraft: ActivityDraft,
  options: { connectReady: boolean },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  let draft = syncScheduleFromEventDays(sourceDraft);
  if (draft.type === "session") {
    draft = { ...draft, isPaid: false };
  }

  const validationError = validateActivityDraft(draft);
  if (validationError) return { ok: false, error: validationError };

  const { data: existing, error: existingError } = await supabase
    .from("activities")
    .select("id,creator_id,type,root_job_id")
    .eq("id", activityId)
    .maybeSingle();

  if (existingError || !existing) {
    return { ok: false, error: "Activity not found." };
  }
  if ((existing as { creator_id: string }).creator_id !== userId) {
    return { ok: false, error: "You can only edit activities you created." };
  }
  if ((existing as { type: string }).type !== draft.type) {
    return { ok: false, error: "Activity type cannot be changed after publish." };
  }

  const requirePayment =
    draft.type !== "session" &&
    draft.isPaid &&
    (draft.type === "class"
      ? draft.priceAmount >= 0.5
      : draft.ticketOptions.some((t) => t.label.trim() && t.priceAmount >= 0.5));

  if (requirePayment && !options.connectReady) {
    return {
      ok: false,
      error: "Finish Stripe payment setup before publishing a paid activity.",
    };
  }

  const location = locationDisplayString(draft) || null;
  const updates: Record<string, unknown> = {
    title: draft.title.trim(),
    description: trimOrNull(draft.description),
    location,
    cover_image_url: trimOrNull(draft.coverImageUrl),
    activity_date: draft.activityDate || null,
    start_time: draft.startTime ? normalizeTime(draft.startTime) : null,
    end_date: draft.endDate || draft.activityDate || null,
    end_time: draft.endTime ? normalizeTime(draft.endTime) : null,
    max_attendees: draft.maxAttendees,
    spots_remaining: draft.maxAttendees,
    is_private: !draft.isPublic,
    require_payment: requirePayment,
  };

  if (draft.type === "event") {
    Object.assign(updates, {
      category: trimOrNull(draft.category),
      subcategory: trimOrNull(draft.subcategory),
      price_currency: requirePayment ? "usd" : null,
      pricing_tiers: requirePayment ? legacyPricingTiers(draft.ticketOptions) : null,
      event_highlights: normalizeStringList(draft.eventHighlights, 5),
      event_lineup: normalizeStringList(draft.eventLineup, 20),
      event_schedule_items: draft.eventScheduleItems
        .filter((item) => item.title.trim())
        .map((item) => ({
          id: item.id,
          time_label: item.timeLabel.trim(),
          title: item.title.trim(),
          detail: item.detail.trim(),
        })),
      event_dress_code: trimOrNull(draft.eventDressCode),
      event_arrival_notes: trimOrNull(draft.eventArrivalNotes),
      event_food_drinks_info: trimOrNull(draft.eventFoodDrinksInfo),
      event_accessibility_info: trimOrNull(draft.eventAccessibilityInfo),
      event_late_entry_policy: trimOrNull(draft.eventLateEntryPolicy),
      event_cancellation_policy: trimOrNull(draft.eventCancellationPolicy),
    });
  } else if (draft.type === "class") {
    Object.assign(updates, {
      category: trimOrNull(draft.category),
      subcategory: trimOrNull(draft.subcategory),
      price_amount_cents: requirePayment ? dollarsToCents(draft.priceAmount) : null,
      price_currency: requirePayment ? "usd" : null,
      max_guest_spots: draft.maxGuestSpots,
      class_what_you_will_learn: normalizeStringList(draft.whatYouWillLearn, 5),
      class_skill_level: trimOrNull(draft.skillLevel),
      class_focus: trimOrNull(draft.classFocus),
      class_intensity: trimOrNull(draft.intensity),
      class_prerequisites: trimOrNull(draft.prerequisites),
      class_dress_code: trimOrNull(draft.dressCode),
      class_equipment: trimOrNull(draft.whatToBring),
      class_cancellation_policy: trimOrNull(draft.cancellationPolicy),
    });
  } else {
    Object.assign(updates, {
      subcategory: trimOrNull(draft.sessionType),
      session_level: trimOrNull(draft.sessionLevel),
      session_vibe: trimOrNull(draft.sessionVibe),
      session_rules: trimOrNull(draft.sessionRules),
      session_good_to_know: trimOrNull(draft.sessionGoodToKnow),
      session_dress_code: trimOrNull(draft.dressCode),
      session_equipment: trimOrNull(draft.whatToBring),
      session_cancellation_policy: trimOrNull(draft.cancellationPolicy),
      session_tags: normalizeStringList(draft.sessionTags, 10),
      require_payment: false,
      price_amount_cents: null,
    });
  }

  const { error } = await supabase.from("activities").update(updates).eq("id", activityId);
  if (error) {
    console.error("[activities] update activity", error.message);
    return { ok: false, error: "Could not update the activity." };
  }

  if (draft.type === "event") {
    const daysResult = await replaceEventDays(supabase, activityId, draft);
    if (!daysResult.ok) return daysResult;
    const ticketsResult = await replaceTicketOptions(supabase, activityId, draft);
    if (!ticketsResult.ok) return ticketsResult;

    const rootJobId = (existing as { root_job_id: string | null }).root_job_id;
    if (rootJobId) {
      await supabase
        .from("jobs")
        .update({
          title: draft.title.trim(),
          description: trimOrNull(draft.description),
          start_date: draft.activityDate || null,
          end_date: draft.endDate || draft.activityDate || null,
          location,
          cover_image_url: trimOrNull(draft.coverImageUrl),
        })
        .eq("id", rootJobId);
    }
  }

  await syncCollaborators(supabase, activityId, draft.collaboratorUserIds, userId);
  return { ok: true, id: activityId };
}
