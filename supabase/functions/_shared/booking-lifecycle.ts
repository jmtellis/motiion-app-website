export type WorkDateRange = {
  date: string;
  start_time?: string | null;
  end_time?: string | null;
};

export type ProjectWorkSchedule = {
  dates: WorkDateRange[];
  isOngoing: boolean;
  datesUnknown: boolean;
};

const TERMINAL = new Set([
  "completed",
  "unavailable",
  "released",
  "declined",
  "cancelled",
  "removed",
  "expired",
]);

export function participationIsConfirmed(status: string, confirmedAt?: string | null): boolean {
  return Boolean(confirmedAt) || status === "confirmed" || status === "completed";
}

export function projectWorkSchedule(input: {
  projectDetails?: Record<string, unknown> | null;
  projectStart?: string | null;
  projectEnd?: string | null;
  castingConfiguration?: Record<string, unknown> | null;
}): ProjectWorkSchedule {
  const details = input.projectDetails ?? {};
  const casting = input.castingConfiguration ?? {};
  if (details.dates_not_confirmed === true || casting.production_dates_not_known_confirmed === true) {
    return { dates: [], isOngoing: false, datesUnknown: true };
  }
  const selected = datesFromCategories(details.schedule_categories);
  if (selected.length) return { dates: selected, isOngoing: false, datesUnknown: false };
  return boundedEnd(text(details.start_date), text(details.end_date))
    ?? boundedEnd(input.projectStart, input.projectEnd)
    ?? { dates: [], isOngoing: false, datesUnknown: false };
}

export function finalWorkInstant(dates: WorkDateRange[] | null | undefined, timeZone: string): Date | null {
  if (!dates?.length) return null;
  const zone = validTimeZone(timeZone);
  const byDay = new Map<string, { allDay: boolean; latest: Date | null }>();
  for (const range of dates) {
    const key = dayKey(range.date);
    if (!key) continue;
    const close = byDay.get(key) ?? { allDay: false, latest: null };
    const timed = clockTime(range.end_time, key, zone);
    if (!timed) close.allDay = true;
    else if (!close.latest || timed > close.latest) close.latest = timed;
    byDay.set(key, close);
  }
  const last = [...byDay.keys()].sort().at(-1);
  if (!last) return null;
  const close = byDay.get(last)!;
  if (close.allDay || !close.latest) return zonedDate(addDays(last, 1), "00:00:00", zone);
  return close.latest;
}

export function unconfirmedWorkHasPassed(input: {
  status: string;
  confirmedAt?: string | null;
  bookingDates?: WorkDateRange[] | null;
  schedule?: ProjectWorkSchedule | null;
  timeZone?: string | null;
  now: Date;
}): boolean {
  if (participationIsConfirmed(input.status, input.confirmedAt) || TERMINAL.has(input.status)) return false;
  const zone = input.timeZone || "UTC";
  const bookingEnd = finalWorkInstant(input.bookingDates, zone);
  if (bookingEnd) return bookingEnd.getTime() <= input.now.getTime();
  const schedule = input.schedule ?? { dates: [], isOngoing: false, datesUnknown: false };
  if (schedule.datesUnknown || schedule.isOngoing) return false;
  const projectEnd = finalWorkInstant(schedule.dates, zone);
  return projectEnd ? projectEnd.getTime() <= input.now.getTime() : false;
}

export function bookingFacingLabel(input: {
  status: string;
  confirmedAt?: string | null;
  bookingDates?: WorkDateRange[] | null;
  schedule?: ProjectWorkSchedule | null;
  timeZone?: string | null;
  memo?: { status: string; expires_at?: string | null; payment_state?: string | null } | null;
  now: Date;
}): string {
  const passed = unconfirmedWorkHasPassed(input);
  if (passed) return "Not confirmed — dates passed";
  if (TERMINAL.has(input.status)) return statusWords(input.status);
  const expired = memoOfferExpired(input.memo, input.now);
  if (expired) {
    return participationIsConfirmed(input.status, input.confirmedAt) ? "Confirmed" : "Contract expired";
  }
  if (input.memo?.status) return memoTitle(input.memo.status);
  if (participationIsConfirmed(input.status, input.confirmedAt)) return "Confirmed";
  return statusWords(input.status);
}

function memoOfferExpired(
  memo: { status: string; expires_at?: string | null; payment_state?: string | null } | null | undefined,
  now: Date,
): boolean {
  if (!memo) return false;
  if (memo.payment_state === "processing" || memo.payment_state === "succeeded") return false;
  if (memo.status === "expired") return true;
  if (memo.status !== "payment_pending" || !memo.expires_at) return false;
  return new Date(memo.expires_at).getTime() <= now.getTime();
}

function memoTitle(status: string): string {
  switch (status) {
    case "draft": return "Draft offer";
    case "offered": return "Awaiting talent";
    case "negotiating": return "Awaiting talent";
    case "accepted":
    case "payment_pending": return "Ready for payment";
    case "paid": return "Paid / Booked";
    case "declined": return "Declined";
    case "cancelled": return "Canceled";
    case "expired": return "Contract expired";
    default: return statusWords(status);
  }
}

function statusWords(status: string): string {
  switch (status) {
    case "cancelled": return "Canceled";
    case "confirmed": return "Confirmed";
    case "completed": return "Completed";
    case "declined": return "Declined";
    case "unavailable": return "Unavailable";
    default: return status.replaceAll("_", " ");
  }
}

function datesFromCategories(raw: unknown): WorkDateRange[] {
  if (!Array.isArray(raw)) return [];
  const endTimes = new Map<string, string[]>();
  const missing = new Set<string>();
  for (const category of raw) {
    if (!category || typeof category !== "object") continue;
    const record = category as Record<string, unknown>;
    const days = Array.isArray(record.selected_days_yyyymmdd) ? record.selected_days_yyyymmdd : [];
    const ends = record.end_time_by_day && typeof record.end_time_by_day === "object"
      ? record.end_time_by_day as Record<string, unknown>
      : {};
    for (const day of days) {
      const key = dayKey(String(day));
      if (!key) continue;
      const end = typeof ends[key] === "string" ? ends[key].trim() : "";
      if (!clockParts(end)) missing.add(key);
      else endTimes.set(key, [...(endTimes.get(key) ?? []), end]);
    }
  }
  return [...new Set([...endTimes.keys(), ...missing])].sort().map((day) => ({
    date: day,
    end_time: missing.has(day) ? null : endTimes.get(day)?.sort().at(-1) ?? null,
  }));
}

function boundedEnd(start: string | null | undefined, end: string | null | undefined): ProjectWorkSchedule | null {
  const hasStart = Boolean(dayKey(start));
  const hasEnd = Boolean(dayKey(end));
  if (hasStart && !hasEnd) return { dates: [], isOngoing: true, datesUnknown: false };
  if (hasEnd) return { dates: [{ date: dayKey(end)! }], isOngoing: false, datesUnknown: false };
  return null;
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function dayKey(value: string | null | undefined): string | null {
  const text = value?.trim() ?? "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return text;
}

function addDays(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function clockParts(raw: string | null | undefined): [number, number, number] | null {
  const text = raw?.trim() ?? "";
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(text);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? 0);
  if (hour > 23 || minute > 59 || second > 59) return null;
  return [hour, minute, second];
}

function clockTime(raw: string | null | undefined, day: string, timeZone: string): Date | null {
  const parts = clockParts(raw);
  if (!parts) return null;
  const [hour, minute, second] = parts;
  return zonedDate(day, `${pad(hour)}:${pad(minute)}:${pad(second)}`, timeZone);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function validTimeZone(timeZone: string): string {
  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return "UTC";
  }
}

function zonedDate(day: string, time: string, timeZone: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  const [hour, minute, second] = time.split(":").map(Number);
  const utcGuess = Date.UTC(year, month - 1, date, hour, minute, second);
  const offset = timeZoneOffset(utcGuess, timeZone);
  const corrected = utcGuess - offset;
  const secondOffset = timeZoneOffset(corrected, timeZone);
  return new Date(utcGuess - secondOffset);
}

function timeZoneOffset(utcMillis: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMillis));
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const hour = read("hour") === 24 ? 0 : read("hour");
  const asUtc = Date.UTC(read("year"), read("month") - 1, read("day"), hour, read("minute"), read("second"));
  return asUtc - utcMillis;
}
