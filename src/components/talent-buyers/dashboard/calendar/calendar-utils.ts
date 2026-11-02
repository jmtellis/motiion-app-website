import type { CalendarEvent } from "@/app/(buyer-app)/(paid)/events/actions";
import type { BuyerEventType } from "@/types/talent-buyer-dashboard";

export type CalendarView = "day" | "week" | "month";

export const HOUR_HEIGHT = 56;
export const HOURS = Array.from({ length: 24 }, (_, i) => i);
export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type PlacedEvent = CalendarEvent & {
  top: number;
  height: number;
  column: number;
  columnCount: number;
};

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const originalDay = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(originalDay, lastDay));
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function monthGridDays(anchor: Date): Date[] {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function formatHourLabel(hour: number): string {
  if (hour === 0 || hour === 24) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

export function formatTimeShort(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr) % 24;
  const m = Number(mStr);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  if (m === 0) return `${hour12} ${period}`;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatTimeRange(start: string, end: string | null): string {
  if (!end) return formatTimeShort(start);
  return `${formatTimeShort(start)} – ${formatTimeShort(end)}`;
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTimeLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return formatTimeShort(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
}

export function eventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
  const key = toDateKey(date);
  return events.filter((e) => e.date === key).sort((a, b) =>
    Number(Boolean(b.allDay)) - Number(Boolean(a.allDay))
    || a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id));
}

export function layoutDayEvents(events: CalendarEvent[]): PlacedEvent[] {
  const bounds = (event: CalendarEvent) => {
    const start = Math.max(0, Math.min(1439, parseTimeToMinutes(event.startTime)));
    const rawEnd = event.endTime ? parseTimeToMinutes(event.endTime) : start + 60;
    // Overnight entries reach midnight; activity normalization creates the next-day segment.
    const end = Math.min(1440, Math.max(start + 30, rawEnd <= start ? 1440 : rawEnd));
    return { start, end };
  };
  const sorted = events.filter((event) => !event.allDay)
    .map((event) => ({ event, ...bounds(event) }))
    .filter(({ start, end }) => Number.isFinite(start) && Number.isFinite(end))
    .sort((a, b) => a.start - b.start || b.end - a.end || a.event.id.localeCompare(b.event.id));
  const placed: PlacedEvent[] = [];
  let group: PlacedEvent[] = [];
  let groupEnd = -1;
  let columns: number[] = [];
  const finishGroup = () => {
    for (const event of group) event.columnCount = columns.length;
    group = [];
    columns = [];
  };
  for (const { event, start, end } of sorted) {
    if (start >= groupEnd) finishGroup();
    let column = columns.findIndex((columnEnd) => columnEnd <= start);
    if (column < 0) column = columns.length;
    columns[column] = end;
    const item = { ...event, top: start / 60 * HOUR_HEIGHT, height: (end - start) / 60 * HOUR_HEIGHT,
      column, columnCount: 1 };
    placed.push(item);
    group.push(item);
    groupEnd = Math.max(group.length === 1 ? end : groupEnd, end);
  }
  finishGroup();
  return placed;
}

export function eventTypeColor(type: BuyerEventType): { accent: string; bg: string } {
  switch (type) {
    case "class":
      return { accent: "#00aacc", bg: "rgb(0 170 204 / 0.12)" };
    case "session":
      return { accent: "#a78bfa", bg: "rgb(167 139 250 / 0.12)" };
    case "event":
      return { accent: "#fbbf24", bg: "rgb(251 191 36 / 0.12)" };
    case "casting":
      return { accent: "#f472b6", bg: "rgb(244 114 182 / 0.12)" };
    case "audition":
      return { accent: "#60a5fa", bg: "rgb(96 165 250 / 0.12)" };
    default:
      return { accent: "#a3a3a3", bg: "rgb(163 163 163 / 0.12)" };
  }
}

export function navigateAnchor(date: Date, view: CalendarView, direction: -1 | 1): Date {
  switch (view) {
    case "day":
      return addDays(date, direction);
    case "week":
      return addDays(date, direction * 7);
    case "month":
      return addMonths(date, direction);
  }
}
