import type { CalendarEvent } from "@/app/(buyer-app)/events/actions";
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
  d.setMonth(d.getMonth() + months);
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
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

export function formatTimeShort(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
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
  return events.filter((e) => e.date === key);
}

export function layoutDayEvents(events: CalendarEvent[]): PlacedEvent[] {
  if (!events.length) return [];

  const sorted = [...events].sort(
    (a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime),
  );

  const placed: PlacedEvent[] = [];
  const columns: { end: number }[] = [];

  for (const event of sorted) {
    const startMin = parseTimeToMinutes(event.startTime);
    const endMin = event.endTime
      ? parseTimeToMinutes(event.endTime)
      : startMin + 60;
    const duration = Math.max(endMin - startMin, 30);

    let column = columns.findIndex((col) => col.end <= startMin);
    if (column === -1) {
      column = columns.length;
      columns.push({ end: endMin });
    } else {
      columns[column].end = endMin;
    }

    placed.push({
      ...event,
      top: (startMin / 60) * HOUR_HEIGHT,
      height: (duration / 60) * HOUR_HEIGHT,
      column,
      columnCount: 1,
    });
  }

  // Resolve column counts for overlapping groups
  for (let i = 0; i < placed.length; i++) {
    const a = placed[i];
    const aStart = parseTimeToMinutes(a.startTime);
    const aEnd = a.endTime ? parseTimeToMinutes(a.endTime) : aStart + 60;

    let maxCol = a.column;
    for (let j = 0; j < placed.length; j++) {
      if (i === j) continue;
      const b = placed[j];
      const bStart = parseTimeToMinutes(b.startTime);
      const bEnd = b.endTime ? parseTimeToMinutes(b.endTime) : bStart + 60;
      if (aStart < bEnd && bStart < aEnd) {
        maxCol = Math.max(maxCol, b.column);
      }
    }
    a.columnCount = maxCol + 1;
  }

  return placed;
}

export function eventTypeColor(type: BuyerEventType): { accent: string; bg: string } {
  switch (type) {
    case "class":
      return { accent: "#2dd4bf", bg: "rgb(45 212 191 / 0.12)" };
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
