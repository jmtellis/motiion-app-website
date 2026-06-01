import { callSupabaseFunction } from "@/lib/supabaseRest";
import type { PublicActivity } from "@/types/public";

type ActivityResponse = { activity: PublicActivity };

export async function fetchPublicActivity(id: string): Promise<PublicActivity | null> {
  const trimmed = decodeURIComponent(id).trim();
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

export function formatMoney(cents: number | null | undefined, currency = "usd"): string {
  if (cents == null) return "";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
