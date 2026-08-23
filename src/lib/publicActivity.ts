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

function ordinalDay(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

function formatProgramTime12Hour(startTime: string | null | undefined): string | null {
  if (!startTime?.trim()) return null;
  const raw = startTime.trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  const period = hours >= 12 ? "p.m." : "a.m.";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const minutePart = minutes === 0 ? "" : `:${String(minutes).padStart(2, "0")}`;
  return `${hour12}${minutePart} ${period}`;
}

/** e.g. "Sunday, August 23rd at 7:00 p.m." — readable date and 12-hour time for program pages. */
export function formatProgramDateTime(activity: PublicActivity): string | null {
  const raw = activity.activityDate?.trim();
  if (!raw) return null;

  const date = new Date(`${raw.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return raw;

  const weekday = date.toLocaleDateString(undefined, { weekday: "long" });
  const month = date.toLocaleDateString(undefined, { month: "long" });
  const day = date.getDate();
  const datePart = `${weekday}, ${month} ${ordinalDay(day)}`;

  const timePart = formatProgramTime12Hour(activity.startTime);
  return timePart ? `${datePart} at ${timePart}` : datePart;
}

export function formatTalentTypeDisplayLine(
  talentTypes: string[] | null | undefined,
  fallback = "Featured Talent",
): string {
  const values = (talentTypes ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) =>
      value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()),
    );
  return values.length > 0 ? values.join(", ") : fallback;
}

/** e.g. "Dancer · WME" — talent self-ID plus agency when present. */
export function formatFeaturedPerformerMetaLine(
  talentTypes: string[] | null | undefined,
  representation: string | null | undefined,
): string | null {
  const role = formatTalentTypeDisplayLine(talentTypes, "").trim();
  const agency = representation?.trim() ?? "";
  if (role && agency) return `${role} · ${agency}`;
  if (role) return role;
  if (agency) return agency;
  return null;
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

export function eventHeroEyebrow(activity: PublicActivity): string {
  const category = activity.category?.trim() || "Event";
  return `Upcoming ${category}`;
}

export function eventHeroSubtitle(activity: PublicActivity): string {
  const dateLine = formatActivityDateTime(activity);
  const place =
    activity.location
      ?.trim()
      .split(",")
      .map((part) => part.trim())
      .find(Boolean) ?? "";
  return [dateLine !== "Date coming soon" ? dateLine : "", place].filter(Boolean).join(" | ");
}

export function formatEventScheduleTime(isoOrTime: string | null | undefined): string | null {
  if (!isoOrTime?.trim()) return null;
  const raw = isoOrTime.trim();
  // ISO datetime from Supabase JSON
  const asDate = new Date(raw);
  if (!Number.isNaN(asDate.getTime()) && raw.includes("T")) {
    return asDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  // HH:MM[:SS]
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      const d = new Date();
      d.setHours(hours, minutes, 0, 0);
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }
  }
  return raw;
}

export function mapsUrlForLocation(location: string): string {
  return `https://maps.apple.com/?q=${encodeURIComponent(location.trim())}`;
}

export function findFeaturedTalent(
  activity: PublicActivity,
  talentId: string,
): import("@/types/public").PublicFeaturedTalent | null {
  const needle = decodeURIComponent(talentId).trim().toLowerCase();
  if (!needle) return null;
  const roots = activity.featuredTalent ?? [];
  for (const root of roots) {
    if (root.userId.toLowerCase() === needle || root.username?.toLowerCase() === needle) {
      return root;
    }
    for (const child of root.children) {
      if (child.userId.toLowerCase() === needle || child.username?.toLowerCase() === needle) {
        return child;
      }
    }
  }
  return null;
}

export function featuredTalentPath(eventId: string, talentUserId: string): string {
  return `/event/${encodeURIComponent(eventId)}/featured/${encodeURIComponent(talentUserId)}`;
}

export function eventProgramPath(eventId: string): string {
  return `/event/${encodeURIComponent(eventId)}/program`;
}
