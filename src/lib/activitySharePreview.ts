import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const ACTIVITY_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ActivityShareKind = "class" | "session" | "event";

export type ActivitySharePreview = {
  title: string;
  kind: ActivityShareKind;
};

function isShareKind(value: string | null): value is ActivityShareKind {
  return value === "class" || value === "session" || value === "event";
}

export function activityKindWord(kind: ActivityShareKind | null): string {
  switch (kind) {
    case "class":
      return "class";
    case "event":
      return "event";
    case "session":
      return "session";
    default:
      return "activity";
  }
}

export function activityShareTitle(title: string | null | undefined, kind: ActivityShareKind | null): string {
  const name = title?.trim() ?? "";
  if (name.length > 0) return `${name} on Motiion`;
  switch (kind) {
    case "class":
      return "Class on Motiion";
    case "event":
      return "Event on Motiion";
    case "session":
      return "Session on Motiion";
    default:
      return "Activity on Motiion";
  }
}

export function activityShareDescription(title: string | null | undefined, kind: ActivityShareKind | null): string {
  const name = title?.trim() ?? "";
  const word = activityKindWord(kind);
  if (name.length > 0) return `View ${name} on Motiion.`;
  return `View this ${word} on Motiion.`;
}

/** Active activities, including private ones. The share URL is the access path; this returns title only. */
export async function fetchActivitySharePreview(id: string): Promise<ActivitySharePreview | null> {
  const trimmed = decodeURIComponent(id).trim().toLowerCase();
  if (!ACTIVITY_ID_RE.test(trimmed)) return null;

  const admin = createAdminSupabaseClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("activities")
    .select("title, type, status")
    .eq("id", trimmed)
    .maybeSingle<{ title: string | null; type: string | null; status: string | null }>();

  if (error || !data || data.status !== "active" || !isShareKind(data.type)) return null;

  const title = data.title?.trim() ?? "";
  return {
    title: title.length > 0 ? title : activityShareTitle(null, data.type).replace(/ on Motiion$/, ""),
    kind: data.type,
  };
}

export function activityOgImageUrl(activityId: string): string | undefined {
  const trimmed = decodeURIComponent(activityId).trim().toLowerCase();
  if (!ACTIVITY_ID_RE.test(trimmed)) return undefined;

  const explicit = process.env.NEXT_PUBLIC_PROFILE_OG_BASE_URL?.replace(/\/$/, "");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const base = explicit?.replace(/\/profile-og$/, "") ?? supabaseUrl;
  if (!base) return undefined;

  const functionBase = base.endsWith("/functions/v1") ? base : `${base}/functions/v1`;
  return `${functionBase}/activity-og?activityId=${encodeURIComponent(trimmed)}`;
}
