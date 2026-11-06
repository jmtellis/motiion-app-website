import type { CalendarEvent } from "@/app/(buyer-app)/(paid)/events/actions";

export type CalendarActivity = {
  id: string;
  title: string;
  type: string | null;
  activity_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  status: string | null;
};

export type CalendarActivityDay = {
  id?: string;
  activity_id: string;
  day_date: string;
  start_time: string | null;
  end_time: string | null;
};

/** Activity dates are wall-clock dates, never UTC timestamps. */
export function validCalendarDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function time(value: string | null) {
  const match = value?.match(/^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  return match && Number(match[1]) < 24 && Number(match[2]) < 60
    ? `${match[1]}:${match[2]}`
    : null;
}

/** One entry per scheduled day; an enrollment and invite never duplicate an activity. */
export function buildCalendarActivityEvents(
  activities: CalendarActivity[],
  days: CalendarActivityDay[],
  counts: ReadonlyMap<string, number> = new Map(),
  admittedDayIds: ReadonlyMap<string, ReadonlySet<string>> = new Map(),
): CalendarEvent[] {
  const seen = new Set<string>();
  const daysByActivity = new Map<string, CalendarActivityDay[]>();
  for (const day of days) {
    if (!validCalendarDate(day.day_date)) continue;
    const list = daysByActivity.get(day.activity_id) ?? [];
    list.push(day);
    daysByActivity.set(day.activity_id, list);
  }

  const events: CalendarEvent[] = [];
  for (const activity of activities) {
    if (seen.has(activity.id) || activity.status === "cancelled") continue;
    if (!["class", "session", "event"].includes(activity.type ?? "")) continue;
    seen.add(activity.id);
    const allDays = daysByActivity.get(activity.id);
    const allowedDays = admittedDayIds.get(activity.id);
    const schedule = allowedDays ? (allDays ?? []).filter((day) => day.id && allowedDays.has(day.id)) : allDays;
    // A known day-based admission never falls back to the event's first date.
    if (allowedDays && !schedule?.length) continue;
    const slots = schedule?.length ? schedule : validCalendarDate(activity.activity_date) ? [{
      activity_id: activity.id,
      day_date: activity.activity_date,
      start_time: activity.start_time,
      end_time: activity.end_time,
    }] : [];
    const seenSlots = new Set<string>();
    for (const slot of slots) {
      const startTime = time(slot.start_time);
      const endTime = time(slot.end_time);
      const slotKey = `${slot.day_date}:${startTime ?? "all-day"}:${endTime ?? ""}`;
      if (seenSlots.has(slotKey)) continue;
      seenSlots.add(slotKey);
      const event: CalendarEvent = {
        id: `${activity.id}:${slotKey}`,
        activityId: activity.id,
        href: `/activity/${activity.id}`,
        title: activity.title,
        eventType: activity.type as CalendarEvent["eventType"],
        date: slot.day_date,
        startTime: startTime ?? "00:00",
        endTime: startTime ? endTime : null,
        allDay: !startTime,
        location: activity.location?.trim() || "Location TBD",
        attendeeCount: counts.get(activity.id),
      };
      if (startTime && endTime && endTime < startTime) {
        // Split an overnight wall-clock slot at midnight, including DST transition nights.
        events.push({ ...event, endTime: "24:00" });
        if (endTime !== "00:00") {
          const next = new Date(`${slot.day_date}T12:00:00Z`);
          next.setUTCDate(next.getUTCDate() + 1);
          events.push({ ...event, id: `${event.id}:continuation`, date: next.toISOString().slice(0, 10), startTime: "00:00" });
        }
      } else {
        events.push(event);
      }
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date)
    || Number(Boolean(b.allDay)) - Number(Boolean(a.allDay))
    || a.startTime.localeCompare(b.startTime)
    || a.id.localeCompare(b.id));
}


export type CalendarConfirmation = { id: string; status: string; project_id?: string; projectTitle?: string | null; work_title?: string | null; timezone?: string | null; date_ranges?: unknown };
/** Confirmed coordination appears as project-local time with an explicit zone. No holds or offers. */
export function buildConfirmedProjectEvents(records: CalendarConfirmation[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const seen = new Set<string>();
  for (const record of records) {
    if (record.status !== "confirmed" || seen.has(record.id)) continue;
    seen.add(record.id);
    const days: CalendarActivityDay[] = Array.isArray(record.date_ranges) ? record.date_ranges.flatMap((value: unknown) => {
      if (!value || typeof value !== "object") return [];
      const range = value as Record<string, unknown>;
      if (typeof range.date !== "string" || !validCalendarDate(range.date)) return [];
      return [{ activity_id: record.id, day_date: range.date, start_time: typeof range.start_time === "string" ? range.start_time : null, end_time: typeof range.end_time === "string" ? range.end_time : null }];
    }) : [];
    const entries = buildCalendarActivityEvents([{ id: record.id, title: [record.projectTitle, record.work_title].filter(Boolean).join(" · ") || "Confirmed project", type: "event", status: "active", activity_date: null, start_time: null, end_time: null, location: "Project schedule" }], days);
    for (const entry of entries) events.push({ ...entry, activityId: undefined, id: `confirmation:${entry.id}`, href: `/activities?view=projects&booking=${encodeURIComponent(record.id)}`, timeZone: record.timezone || undefined });
  }
  return events;
}
