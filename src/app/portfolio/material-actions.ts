"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { requireTalentAccount } from "@/lib/auth/session";
import { parseResumeExperienceCategory } from "@/lib/profile/resume-experience";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const url = z.string().trim().url().refine((value) => /^https?:$/.test(new URL(value).protocol), "Use a web URL.");
const uuid = z.string().trim().uuid();
const HEADSHOTS_BUCKET = "headshots";
const VIDEOS_BUCKET = "profile-videos";

async function context() {
  const profile = await requireTalentAccount();
  const client = await createServerSupabaseClient();
  return client ? { client, userId: profile.id } : null;
}

type Client = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;

function refresh() {
  revalidatePath("/portfolio");
  revalidatePath("/home");
  revalidatePath("/profile/[slug]", "page");
}

function friendly(message: string | undefined, fallback: string) {
  if (!message) return fallback;
  // Plan-limit trigger messages are written for end users.
  if (/quota|Upgrade to Pro|Free portfolios/i.test(message)) return message;
  return fallback;
}

function records(raw: unknown): Record<string, unknown>[] {
  return Array.isArray(raw)
    ? raw.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

/** Paths of the user's own objects in a public bucket, for cleanup after a successful save. */
function ownedPaths(urls: string[], bucket: string, userId: string, prefix = "") {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const folder = `${userId.toLowerCase()}/${prefix}`;
  return urls.flatMap((value) => {
    const index = value.indexOf(marker);
    if (index === -1) return [];
    const path = decodeURIComponent(value.slice(index + marker.length).split("?")[0] ?? "");
    return path.startsWith(folder) ? [path] : [];
  });
}

async function removeObjects(client: Client, bucket: string, paths: string[]) {
  if (!paths.length) return;
  try {
    await client.storage.from(bucket).remove(paths);
  } catch {
    // Orphaned objects are harmless; the profile row is canonical.
  }
}

const headshotsInput = z
  .object({
    urls: z.array(url).min(1, "Add at least one headshot.").max(10),
    originals: z.array(url).max(10),
    labels: z.array(z.string().trim().max(60)).max(10),
  })
  .refine((value) => value.originals.length === value.urls.length && value.labels.length === value.urls.length, "Headshot data is out of sync. Reload and try again.");

export async function savePortfolioHeadshots(input: unknown): Promise<Result> {
  const parsed = headshotsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your headshots." };
  const ctx = await context();
  if (!ctx) return { ok: false, error: "Unable to connect. Try again." };
  const { client, userId } = ctx;

  const { data: before } = await client
    .from("profiles")
    .select("headshot_urls, headshot_original_urls")
    .eq("user_id", userId)
    .maybeSingle<{ headshot_urls: unknown; headshot_original_urls: unknown }>();

  const { urls, originals, labels } = parsed.data;
  const { error } = await client
    .from("profiles")
    .update({ headshot_urls: urls, headshot_original_urls: originals, headshot_labels: labels, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) return { ok: false, error: friendly(error.message, "Could not save your headshots. Try again.") };

  const kept = new Set([...urls, ...originals]);
  const previous = [
    ...(Array.isArray(before?.headshot_urls) ? before.headshot_urls : []),
    ...(Array.isArray(before?.headshot_original_urls) ? before.headshot_original_urls : []),
  ].filter((value): value is string => typeof value === "string" && !kept.has(value));
  await removeObjects(client, HEADSHOTS_BUCKET, ownedPaths(previous, HEADSHOTS_BUCKET, userId, "headshot_"));

  refresh();
  return { ok: true };
}

const highlightsInput = z
  .array(
    z.object({
      id: uuid,
      experience_id: uuid.nullable(),
      title: z.string().trim().min(1, "Each highlight needs a project.").max(200),
      subtitle: z.string().trim().max(250).nullable(),
      image_url: url.nullable(),
    }),
  )
  .max(10);

export async function savePortfolioHighlights(input: unknown): Promise<Result> {
  const parsed = highlightsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your highlights." };
  const ctx = await context();
  if (!ctx) return { ok: false, error: "Unable to connect. Try again." };
  const { client, userId } = ctx;

  const { data, error: readError } = await client
    .from("profiles")
    .select("profile_highlights")
    .eq("user_id", userId)
    .maybeSingle<{ profile_highlights: unknown }>();
  if (readError) return { ok: false, error: "Could not load your highlights. Try again." };
  const existing = records(data?.profile_highlights);

  const items = parsed.data.map((item) => ({ ...existing.find((row) => row.id === item.id), ...item }));
  const { error } = await client
    .from("profiles")
    .update({ profile_highlights: items, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) return { ok: false, error: friendly(error.message, "Could not save your highlights. Try again.") };
  refresh();
  return { ok: true };
}

const visualsInput = z
  .array(
    z.object({
      id: uuid,
      kind: z.enum(["reel", "slate", "style", "skill", "other"]),
      ref: z.string().trim().max(150).nullable(),
      url,
      sort: z.number().int().min(0).max(1000),
      duration_seconds: z.number().min(0).max(3600).nullable(),
    }),
  )
  .max(200);

export async function savePortfolioVisuals(input: unknown): Promise<Result> {
  const parsed = visualsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your visuals." };
  const ctx = await context();
  if (!ctx) return { ok: false, error: "Unable to connect. Try again." };
  const { client, userId } = ctx;

  const { data, error: readError } = await client
    .from("profiles")
    .select("profile_visuals")
    .eq("user_id", userId)
    .maybeSingle<{ profile_visuals: unknown }>();
  if (readError) return { ok: false, error: "Could not load your visuals. Try again." };
  const existing = records(data?.profile_visuals);
  // Experience clips are edited on each resume credit; keep them untouched here.
  const experienceClips = existing.filter((row) => String(row.kind).toLowerCase() === "experience");

  const items = [
    ...parsed.data.map((item) => {
      const previous = existing.find((row) => row.id === item.id);
      // Framing belongs to the original clip; drop it when the video is replaced.
      const keep = previous && previous.url === item.url ? previous : {};
      return { ...keep, ...item, duration_seconds: item.duration_seconds ?? undefined };
    }),
    ...experienceClips,
  ];
  const { error } = await client
    .from("profiles")
    .update({ profile_visuals: items, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) return { ok: false, error: friendly(error.message, "Could not save your visuals. Try again.") };

  const kept = new Set(items.map((item) => String(item.url)));
  const removed = existing.map((row) => String(row.url ?? "")).filter((value) => value && !kept.has(value));
  await removeObjects(client, VIDEOS_BUCKET, ownedPaths(removed, VIDEOS_BUCKET, userId));

  refresh();
  return { ok: true };
}

const experiencesInput = z
  .array(z.looseObject({ id: z.string().trim().min(1), title: z.string().trim().min(1, "Each credit needs a title.").max(300) }))
  .max(400);

export async function savePortfolioExperiences(input: unknown): Promise<Result> {
  const parsed = experiencesInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your resume." };
  const ctx = await context();
  if (!ctx) return { ok: false, error: "Unable to connect. Try again." };
  const { error } = await ctx.client
    .from("profiles")
    .update({ experiences: parsed.data, updated_at: new Date().toISOString() })
    .eq("user_id", ctx.userId);
  if (error) return { ok: false, error: "Could not save your resume. Try again." };
  refresh();
  return { ok: true };
}

const importInput = z.object({
  resumeUrl: url,
  experiences: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(300),
        role: z.string().trim().max(200).optional(),
        credits: z.string().trim().max(300).optional(),
        category: z.string().trim().max(60).optional(),
        start_date: z.string().trim().max(60).optional(),
        end_date: z.string().trim().max(60).optional(),
        notes: z.string().trim().max(1000).optional(),
      }),
    )
    .max(200),
});

export async function importPortfolioResume(
  input: unknown,
): Promise<Result & { added?: number; experiences?: (Record<string, unknown> & { id: string; title: string })[] }> {
  const parsed = importInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "We couldn't read credits from that resume." };
  const ctx = await context();
  if (!ctx) return { ok: false, error: "Unable to connect. Try again." };
  const { client, userId } = ctx;

  const { data } = await client
    .from("profiles")
    .select("experiences")
    .eq("user_id", userId)
    .maybeSingle<{ experiences: unknown }>();
  const current = records(data?.experiences);
  const seen = new Set(current.map((row) => `${String(row.title ?? "").trim().toLowerCase()}|${String(row.role ?? "").trim().toLowerCase()}`));

  const added = parsed.data.experiences
    .filter((item) => !seen.has(`${item.title.toLowerCase()}|${(item.role ?? "").toLowerCase()}`))
    .map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      category: parseResumeExperienceCategory(item.category) ?? "televisionFilm",
      roles: item.role ? [item.role] : undefined,
      source: "resume_import",
      source_document_url: parsed.data.resumeUrl,
    }));

  const experiences = [...current, ...added];
  const { error } = await client
    .from("profiles")
    .update({ experiences, resume_url: parsed.data.resumeUrl, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) return { ok: false, error: "Could not add the imported credits. Try again." };
  refresh();
  return {
    ok: true,
    added: added.length,
    experiences: experiences.flatMap((row) => {
      const title = typeof row.title === "string" ? row.title.trim() : "";
      if (!title) return [];
      return [{ ...row, id: typeof row.id === "string" && row.id ? row.id : crypto.randomUUID(), title }];
    }),
  };
}

const sizingInput = z.object({
  sizing: z.string().trim().max(2000),
  height: z.string().trim().max(20),
});

export async function savePortfolioSizing(input: unknown): Promise<Result> {
  const parsed = sizingInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check your measurements." };
  const ctx = await context();
  if (!ctx) return { ok: false, error: "Unable to connect. Try again." };
  const { error } = await ctx.client
    .from("profiles")
    .update({ sizing: parsed.data.sizing || null, height: parsed.data.height || null, updated_at: new Date().toISOString() })
    .eq("user_id", ctx.userId);
  if (error) return { ok: false, error: "Could not save your size sheet. Try again." };
  refresh();
  return { ok: true };
}
