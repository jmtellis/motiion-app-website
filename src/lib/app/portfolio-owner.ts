import { cache } from "react";

import { userHasPaidEntitlement } from "@/lib/billing/entitlement";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PortfolioPlanTier = "free" | "starter" | "pro";

export type OwnerHighlight = {
  id: string;
  experience_id?: string | null;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  [key: string]: unknown;
};

export type OwnerVisualKind = "reel" | "slate" | "style" | "skill" | "other" | "experience";

export type OwnerVisual = {
  id: string;
  kind: OwnerVisualKind;
  ref?: string | null;
  url: string;
  sort?: number;
  duration_seconds?: number | null;
  experience_id?: string | null;
  [key: string]: unknown;
};

export type OwnerExperience = {
  id: string;
  title: string;
  category?: string | null;
  [key: string]: unknown;
};

export type PortfolioOwnerData = {
  userId: string;
  displayName: string;
  username: string | null;
  plan: PortfolioPlanTier;
  headshotUrls: string[];
  headshotOriginalUrls: string[];
  headshotLabels: string[];
  highlights: OwnerHighlight[];
  visuals: OwnerVisual[];
  experiences: OwnerExperience[];
  sizing: string;
  height: string;
  resumeUrl: string | null;
  styles: string[];
  skills: string[];
  location: string | null;
  representation: string | null;
};

type Row = {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  headshot_urls: unknown;
  headshot_original_urls: unknown;
  headshot_labels: unknown;
  profile_highlights: unknown;
  profile_visuals: unknown;
  experiences: unknown;
  sizing: string | null;
  height: string | null;
  resume_url: string | null;
  styles: string[] | null;
  skills: string[] | null;
  working_locations: string[] | null;
  representation: string | null;
};

function strings(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.map((item) => (typeof item === "string" ? item : "")) : [];
}

function records(raw: unknown): Record<string, unknown>[] {
  return Array.isArray(raw)
    ? raw.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export const fetchPortfolioOwnerData = cache(async (userId: string): Promise<PortfolioOwnerData | null> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const [{ data }, paid] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "user_id, display_name, first_name, last_name, username, headshot_urls, headshot_original_urls, headshot_labels, profile_highlights, profile_visuals, experiences, sizing, height, resume_url, styles, skills, working_locations, representation",
      )
      .eq("user_id", userId)
      .maybeSingle<Row>(),
    userHasPaidEntitlement(userId, "talent_pro"),
  ]);
  if (!data) return null;

  const headshotUrls = strings(data.headshot_urls).filter(Boolean);
  const originals = strings(data.headshot_original_urls);
  const labels = strings(data.headshot_labels);

  const experiences = records(data.experiences).flatMap((row) => {
    const title = text(row.title);
    if (!title) return [];
    return [{ ...row, id: text(row.id) || crypto.randomUUID(), title } as OwnerExperience];
  });

  const highlights = records(data.profile_highlights).flatMap((row) => {
    const title = text(row.title);
    if (!title) return [];
    return [{ ...row, id: text(row.id) || crypto.randomUUID(), title } as OwnerHighlight];
  });

  const visuals = records(data.profile_visuals).flatMap((row) => {
    const url = text(row.url);
    const kind = text(row.kind).toLowerCase() as OwnerVisualKind;
    if (!url || !["reel", "slate", "style", "skill", "other", "experience"].includes(kind)) return [];
    return [{ ...row, id: text(row.id) || crypto.randomUUID(), kind, url } as OwnerVisual];
  });

  const displayName =
    data.display_name?.trim() ||
    [data.first_name, data.last_name].filter((part) => part?.trim()).join(" ") ||
    "Your portfolio";

  return {
    userId: data.user_id,
    displayName,
    username: data.username?.trim() || null,
    plan: paid ? "pro" : "free",
    headshotUrls,
    headshotOriginalUrls: headshotUrls.map((url, index) => originals[index] || url),
    headshotLabels: headshotUrls.map((_, index) => labels[index] ?? ""),
    highlights,
    visuals,
    experiences,
    sizing: data.sizing?.trim() ?? "",
    height: data.height?.trim() ?? "",
    resumeUrl: data.resume_url?.trim() || null,
    styles: (data.styles ?? []).filter((item) => item?.trim()),
    skills: (data.skills ?? []).filter((item) => item?.trim()),
    location: data.working_locations?.find((item) => item?.trim()) ?? null,
    representation: data.representation?.trim() || null,
  };
});
