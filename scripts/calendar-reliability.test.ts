import assert from "node:assert/strict";
import { test } from "node:test";
import { buildConfirmedProjectEvents, buildCalendarActivityEvents, validCalendarDate, type CalendarActivity } from "../src/lib/app/calendar-events";
import { addMonths, addDays, eventsForDate, layoutDayEvents, toDateKey } from "../src/components/talent-buyers/dashboard/calendar/calendar-utils";
import { localDateTimeParts, localizeScheduleMarkers, type ScheduleMarker } from "../src/lib/talent-buyers/schedule-markers";
import type { CalendarEvent } from "../src/app/(buyer-app)/(paid)/events/actions";

const activity: CalendarActivity = { id: "a", title: "Weekend workshop", type: "event", activity_date: "2026-11-01", start_time: null, end_time: null, location: "LA", status: "active" };
const timed = (id: string, start: string, end: string): CalendarEvent => ({ id, title: id, date: "2026-11-01", startTime: start, endTime: end, eventType: "event", location: "", attendeeCount: 0 });

test("calendar rejects impossible dates and retains a date-only activity as all day", () => {
  assert.equal(validCalendarDate("2026-02-29"), false);
  assert.equal(validCalendarDate("2028-02-29"), true);
  assert.equal(validCalendarDate("2026-13-01"), false);
  const [event] = buildCalendarActivityEvents([activity], []);
  assert.equal(event.allDay, true);
  assert.equal(event.date, "2026-11-01");
  assert.equal(event.href, "/activity/a");
});

test("saved + enrolled + invited activity appears once and cancelled activities disappear", () => {
  const events = buildCalendarActivityEvents([activity, activity, { ...activity, id: "cancelled", status: "cancelled" }], []);
  assert.equal(events.length, 1);
});

test("every event day appears, exact duplicate days collapse, no guessed time is inherited", () => {
  const events = buildCalendarActivityEvents([{ ...activity, start_time: "09:00" }], [
    { activity_id: "a", day_date: "2026-11-01", start_time: "10:00", end_time: "14:00" },
    { activity_id: "a", day_date: "2026-11-02", start_time: null, end_time: null },
    { activity_id: "a", day_date: "2026-11-01", start_time: "10:00", end_time: "14:00" },
  ]);
  assert.equal(events.length, 2);
  assert.equal(events[1].allDay, true);
  assert.equal(new Set(events.map((event) => event.id)).size, 2);
  assert.ok(events.every((event) => event.activityId === "a" && event.href === "/activity/a"));
});

test("overnight events retain both dates over a daylight-saving transition", () => {
  const events = buildCalendarActivityEvents([{ ...activity, activity_date: "2026-10-31", start_time: "23:00", end_time: "02:30" }], []);
  assert.deepEqual(events.map(({ date, startTime, endTime }) => ({ date, startTime, endTime })), [
    { date: "2026-10-31", startTime: "23:00", endTime: "24:00" },
    { date: "2026-11-01", startTime: "00:00", endTime: "02:30" },
  ]);
});

test("month arrows clamp month-end and calendar-day arithmetic survives DST", () => {
  const originalZone = process.env.TZ;
  try {
    process.env.TZ = "America/Los_Angeles";
    assert.equal(toDateKey(addMonths(new Date(2026, 0, 31), 1)), "2026-02-28");
    assert.equal(toDateKey(addMonths(new Date(2026, 2, 31), -1)), "2026-02-28");
    assert.equal(toDateKey(addDays(new Date(2026, 2, 7), 2)), "2026-03-09");
    assert.equal(toDateKey(addDays(new Date(2026, 9, 31), 2)), "2026-11-02");
  } finally { process.env.TZ = originalZone; }
});

test("timestamp schedules localize but date-only and naive wall-clock schedules do not shift", () => {
  const originalZone = process.env.TZ;
  try {
    process.env.TZ = "America/Los_Angeles";
    assert.deepEqual(localDateTimeParts("2026-11-02"), { date: "2026-11-02", time: null });
    assert.deepEqual(localDateTimeParts("2026-11-02T09:00"), { date: "2026-11-02", time: "09:00" });
    assert.deepEqual(localDateTimeParts("2026-11-02T01:00:00Z"), { date: "2026-11-01", time: "17:00" });
    const marker = { ...timed("audition", "01:00", "02:00"), allDay: false, startsAtIso: "2026-11-02T01:00:00Z", href: "/projects/a", workId: "a", workTitle: "Project", contextLabel: "Audition" } as ScheduleMarker;
    assert.equal(localizeScheduleMarkers([marker])[0].startTime, "17:00");
  } finally { process.env.TZ = originalZone; }
});

test("a day sorts all-day first then by time and identity", () => {
  const events = eventsForDate([timed("late", "15:00", "16:00"), timed("early", "09:00", "10:00"), { ...timed("all", "00:00", "00:00"), allDay: true }], new Date(2026, 10, 1));
  assert.deepEqual(events.map((event) => event.id), ["all", "early", "late"]);
});

test("overlap-connected groups use a consistent width and independent groups reclaim space", () => {
  const placed = layoutDayEvents([
    timed("a", "09:00", "10:00"), timed("b", "09:00", "09:30"),
    timed("c", "09:15", "10:30"), timed("d", "10:00", "11:00"),
    timed("later", "12:00", "13:00"),
  ]);
  assert.deepEqual(placed.map((event) => event.columnCount), [3, 3, 3, 3, 1]);
  assert.equal(placed.at(-1)?.column, 0);
});

test("short visual blocks do not cover another event and midnight is clipped", () => {
  const placed = layoutDayEvents([timed("a", "09:00", "09:05"), timed("b", "09:10", "09:20"), timed("late", "23:45", "00:15")]);
  assert.equal(placed[0].columnCount, 2);
  assert.equal(placed[1].columnCount, 2);
  assert.equal(placed.at(-1)!.top + placed.at(-1)!.height, 24 * 56);
});


test("confirmed project dates preserve project-local days, zone and overnight segments", async () => {
  const { buildConfirmedProjectEvents } = await import("../src/lib/app/calendar-events");
  const record = { id: "coord-1", status: "confirmed", work_title: "Lead", timezone: "America/New_York", date_ranges: [{ date: "2026-11-01", start_time: "23:30", end_time: "01:00" }, { date: "2026-11-03" }] };
  const events = buildConfirmedProjectEvents([record, record, { ...record, id: "hold", status: "on_hold" }, { ...record, id: "cancelled", status: "cancelled" }]);
  assert.equal(events.length, 3);
  assert.deepEqual(events.map((event) => event.date), ["2026-11-01", "2026-11-02", "2026-11-03"]);
  assert.equal(events[2].allDay, true);
  assert.equal(events[0].timeZone, "America/New_York");
  assert.equal(events[0].href, `/activities?view=projects&booking=${record.id}`);
});


test("midnight split labels 24:00 as midnight, never noon", async () => {
  const { formatTimeRange, formatHourLabel } = await import("../src/components/talent-buyers/dashboard/calendar/calendar-utils");
  assert.equal(formatTimeRange("23:00", "24:00"), "11 PM – 12 AM");
  assert.equal(formatHourLabel(24), "12 AM");
});


test("confirmed schedules distinguish projects sharing the same role and link the exact record", () => {
  const rows = ["Show A", "Show B"].map((projectTitle, index) => ({ id: `confirmation-${index}`, status: "confirmed", projectTitle, work_title: "Movement artist", date_ranges: [{ date: "2026-11-20" }] }));
  const events = buildConfirmedProjectEvents(rows);
  assert.deepEqual(events.map((row) => row.title), ["Show A · Movement artist", "Show B · Movement artist"]);
  assert.deepEqual(events.map((row) => row.href), ["/activities?view=projects&booking=confirmation-0", "/activities?view=projects&booking=confirmation-1"]);
});


test("a one-day admission shows only its paid day and timed segment, including saved reminders", () => {
  const days = [
    { id: "day1", activity_id: "a", day_date: "2026-12-14", start_time: "10:00", end_time: "17:00" },
    { id: "day2", activity_id: "a", day_date: "2026-12-15", start_time: "10:00", end_time: "17:00" },
  ];
  const events = buildCalendarActivityEvents([activity, activity], days, new Map(), new Map([["a", new Set(["day2"])]]));
  assert.deepEqual(events.map(({ date, startTime, endTime }) => ({ date, startTime, endTime })), [{ date: "2026-12-15", startTime: "10:00", endTime: "17:00" }]);
  assert.equal(buildCalendarActivityEvents([activity], days, new Map(), new Map([["a", new Set()]])).length, 0);
  assert.equal(buildCalendarActivityEvents([activity], [], new Map(), new Map([["a", new Set(["removed-day"])]] )).length, 0);
  assert.equal(buildCalendarActivityEvents([activity], days).length, 2, "organizers retain the full program");
});
