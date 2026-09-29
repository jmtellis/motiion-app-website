import { supabaseAdmin } from "./supabase-admin.ts";

export type TicketOptionRow = {
  id: string;
  activity_id: string;
  label: string;
  amount_cents: number;
  currency: string;
  access_mode: "all_days" | "select_days" | "fixed_days";
  min_days: number | null;
  max_days: number | null;
  is_active: boolean;
};

export type EventDayRow = {
  id: string;
  activity_id: string;
  day_date: string;
  label: string | null;
  max_attendees: number | null;
  spots_remaining: number | null;
};

export async function fetchTicketOptions(activityId: string): Promise<TicketOptionRow[]> {
  const { data, error } = await supabaseAdmin
    .from("activity_ticket_options")
    .select("id,activity_id,label,amount_cents,currency,access_mode,min_days,max_days,is_active")
    .eq("activity_id", activityId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("event-ticketing fetchTicketOptions failed", error);
    return [];
  }
  return (data ?? []) as TicketOptionRow[];
}

export async function fetchEventDays(activityId: string): Promise<EventDayRow[]> {
  const { data, error } = await supabaseAdmin
    .from("activity_event_days")
    .select("id,activity_id,day_date,label,max_attendees,spots_remaining")
    .eq("activity_id", activityId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("event-ticketing fetchEventDays failed", error);
    return [];
  }
  return (data ?? []) as EventDayRow[];
}

export async function fetchTicketOptionDayIds(ticketOptionId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("activity_ticket_option_days")
    .select("event_day_id")
    .eq("ticket_option_id", ticketOptionId);

  if (error) {
    console.error("event-ticketing fetchTicketOptionDayIds failed", error);
    return [];
  }
  return (data ?? []).map((row: { event_day_id: string }) => row.event_day_id);
}

export function normalizeUuidList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
}

export async function resolveSelectedEventDayIds(args: {
  activityId: string;
  ticketOption: TicketOptionRow;
  selectedEventDayIds: string[];
  allEventDays: EventDayRow[];
}): Promise<{ ok: true; dayIds: string[] } | { ok: false; error: string }> {
  const { ticketOption, selectedEventDayIds, allEventDays } = args;
  const validDayIds = new Set(allEventDays.map((d) => d.id));

  if (ticketOption.access_mode === "all_days") {
    return { ok: true, dayIds: allEventDays.map((d) => d.id) };
  }

  if (ticketOption.access_mode === "fixed_days") {
    const included = await fetchTicketOptionDayIds(ticketOption.id);
    const dayIds = included.filter((id) => validDayIds.has(id));
    if (dayIds.length === 0) {
      return { ok: false, error: "Ticket option has no included days configured" };
    }
    return { ok: true, dayIds };
  }

  const dayIds = selectedEventDayIds.filter((id) => validDayIds.has(id));
  const minDays = ticketOption.min_days ?? 1;
  const maxDays = ticketOption.max_days ?? Math.max(allEventDays.length, minDays);
  if (dayIds.length < minDays || dayIds.length > maxDays) {
    return {
      ok: false,
      error: `Select between ${minDays} and ${maxDays} day(s) for this ticket`,
    };
  }
  if (dayIds.length === 0) {
    return { ok: false, error: "Select at least one event day" };
  }
  return { ok: true, dayIds };
}

export async function validatePerDayCapacity(
  dayIds: string[],
  allEventDays: EventDayRow[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const dayById = new Map(allEventDays.map((d) => [d.id, d]));
  for (const dayId of dayIds) {
    const day = dayById.get(dayId);
    if (!day) continue;
    if (day.max_attendees === null) continue;
    const remaining = day.spots_remaining ?? day.max_attendees;
    if (remaining <= 0) {
      const label = (day.label ?? day.day_date).trim();
      return { ok: false, error: `${label || "A selected day"} is sold out` };
    }
  }
  return { ok: true };
}

export async function createEnrollmentDayEntitlements(args: {
  activityId: string;
  studentId: string;
  dayIds: string[];
  source?: string;
}): Promise<void> {
  const { activityId, studentId, dayIds, source = "purchase" } = args;

  const { data: enrollment, error: enrollmentError } = await supabaseAdmin
    .from("enrollments")
    .select("id")
    .eq("activity_id", activityId)
    .eq("student_id", studentId)
    .in("status", ["paid", "guest", "comped"])
    .maybeSingle<{ id: string }>();

  if (enrollmentError || !enrollment) {
    console.error("event-ticketing createEnrollmentDayEntitlements enrollment lookup failed", {
      activityId,
      studentId,
      enrollmentError,
    });
    return;
  }

  const rows = dayIds.map((eventDayId) => ({
    enrollment_id: enrollment.id,
    event_day_id: eventDayId,
    status: "active",
    source,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length === 0) return;

  const { error: upsertError } = await supabaseAdmin
    .from("enrollment_event_day_entitlements")
    .upsert(rows, { onConflict: "enrollment_id,event_day_id" });

  if (upsertError) {
    console.error("event-ticketing createEnrollmentDayEntitlements upsert failed", upsertError);
    return;
  }

  for (const dayId of dayIds) {
    const { error: syncError } = await supabaseAdmin.rpc("sync_event_day_spots_remaining", {
      p_event_day_id: dayId,
    });
    if (syncError) {
      console.error("event-ticketing sync_event_day_spots_remaining failed", { dayId, syncError });
    }
  }
}
