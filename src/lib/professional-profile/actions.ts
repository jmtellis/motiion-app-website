"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { jsonbToStringArray, textToStringArray } from "@/lib/professional-profile/jsonb-fields";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const draftSchema = z.object({
  styles: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  gender: z.string().nullable().optional(),
  ethnicity: z.string().nullable().optional(),
  height: z.string().nullable().optional(),
  unionStatus: z.string().nullable().optional(),
  workingLocations: z.array(z.string()).default([]),
  instagramUrl: z.string().nullable().optional(),
  tiktokUrl: z.string().nullable().optional(),
  youtubeUrl: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  availability: z.enum(["available", "limited", "unavailable"]).default("available"),
});

export type ProfessionalProfileDraftInput = z.infer<typeof draftSchema>;

function slugFromUsername(username: string | null | undefined, userId: string) {
  const base = username?.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-") || `talent-${userId.slice(0, 8)}`;
  return base.replace(/-+/g, "-").replace(/^-|-$/g, "") || `talent-${userId.slice(0, 8)}`;
}

/** Incremental draft save to professional_profiles (TASK-016). */
export async function upsertProfessionalProfileDraft(
  input: ProfessionalProfileDraftInput,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid profile data" };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const data = parsed.data;
  const primaryCity = data.workingLocations[0] ?? null;

  const { error } = await supabase.from("professional_profiles").upsert(
    {
      user_id: user.id,
      slug: slugFromUsername(data.username, user.id),
      styles: data.styles,
      skills: data.skills,
      gender: data.gender ?? null,
      ethnicity: textToStringArray(data.ethnicity ?? null),
      height_cm: null,
      union_status: data.unionStatus ?? null,
      location_city: primaryCity,
      availability: data.availability,
      social_links: {
        instagram: data.instagramUrl ?? null,
        tiktok: data.tiktokUrl ?? null,
        youtube: null,
      },
    },
    { onConflict: "user_id" },
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/onboarding");
  revalidatePath("/home");
  return { ok: true };
}

/** Load draft from professional_profiles for onboarding restore. */
export async function loadProfessionalProfileDraft(): Promise<{
  draft: ProfessionalProfileDraftInput | null;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { draft: null, error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { draft: null, error: null };

  const { data, error } = await supabase
    .from("professional_profiles")
    .select("styles, skills, gender, ethnicity, union_status, location_city, availability, social_links")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { draft: null, error: error.message };
  if (!data) return { draft: null, error: null };

  const social = (data.social_links ?? {}) as Record<string, string | null>;

  return {
    draft: {
      styles: jsonbToStringArray(data.styles),
      skills: jsonbToStringArray(data.skills),
      gender: data.gender,
      ethnicity: Array.isArray(data.ethnicity) ? data.ethnicity[0] ?? null : null,
      unionStatus: data.union_status,
      workingLocations: data.location_city ? [data.location_city] : [],
      availability: (data.availability as ProfessionalProfileDraftInput["availability"]) ?? "available",
      instagramUrl: social.instagram ?? null,
      tiktokUrl: social.tiktok ?? null,
    },
    error: null,
  };
}
