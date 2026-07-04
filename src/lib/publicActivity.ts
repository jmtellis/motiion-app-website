import { callSupabaseFunction } from "@/lib/supabaseRest";
import type { PublicActivity } from "@/types/public";

type ActivityResponse = { activity: PublicActivity };

export async function fetchPublicActivity(id: string): Promise<PublicActivity | null> {
  const trimmed = decodeURIComponent(id).trim().toLowerCase();
  if (!trimmed) return null;

  try {
    const data = await callSupabaseFunction<ActivityResponse>("public-activity-detail", {
      activityId: trimmed,
    });
    return data.activity ?? null;
  } catch {
    return null;
  }
}

export function activityKindLabel(kind: PublicActivity["kind"]): string {
  switch (kind) {
    case "class":
      return "Class";
    case "session":
      return "Session";
    case "event":
      return "Event";
  }
}

export function activityAccentColor(kind: PublicActivity["kind"]): string {
  switch (kind) {
    case "class":
      return "var(--accent-class)";
    case "session":
      return "var(--accent-session)";
    case "event":
      return "var(--accent-event)";
  }
}

export function formatActivityDateTime(activity: PublicActivity): string {
  const parts: string[] = [];
  if (activity.activityDate) {
    const d = new Date(`${activity.activityDate}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      parts.push(
        d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      );
    } else {
      parts.push(activity.activityDate);
    }
  }
  if (activity.startTime) {
    parts.push(activity.startTime.slice(0, 5));
  }
  return parts.join(" · ") || "Date coming soon";
}

export function formatActivityWhenLine(activity: PublicActivity): string | null {
  const date = activity.activityDate?.trim();
  if (!date) return null;

  let line = date;
  const start = activity.startTime?.trim();
  if (start) line += ` · ${start.slice(0, 5)}`;

  const endDate = activity.endDate?.trim();
  if (endDate && endDate !== date) {
    line += ` – ${endDate}`;
    const endTime = activity.endTime?.trim();
    if (endTime) line += ` · ${endTime.slice(0, 5)}`;
  } else {
    const endTime = activity.endTime?.trim();
    if (endTime) line += ` – ${endTime.slice(0, 5)}`;
  }

  return line;
}

export function activityRouteKind(sharePath: string): PublicActivity["kind"] | null {
  if (sharePath.startsWith("/class")) return "class";
  if (sharePath.startsWith("/session")) return "session";
  if (sharePath.startsWith("/event")) return "event";
  return null;
}

export function effectiveActivityKind(
  activity: PublicActivity,
  sharePath: string,
): PublicActivity["kind"] {
  return activityRouteKind(sharePath) ?? activity.kind;
}

export function formatMoney(cents: number | null | undefined, currency = "usd"): string {
  if (cents == null) return "";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
