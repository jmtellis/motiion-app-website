"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireTalentAccount } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DeferredSetupSkipped } from "@/lib/talent/profile-setup";

const stringArray = z.array(z.string().trim()).default([]);

const experienceSchema = z.object({
  title: z.string().trim().min(1),
  role: z.string().trim().optional(),
  credits: z.string().trim().optional(),
  category: z.string().trim().optional(),
  start_date: z.string().trim().optional(),
  end_date: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  link_url: z.string().trim().optional(),
});

const persistSchema = z.object({
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  displayName: z.string().trim().optional(),
  resumeUrl: z.string().trim().nullable().optional(),
  headshotUrls: stringArray.optional(),
  headshotOriginalUrls: stringArray.optional(),
  talentTypes: z.array(z.enum(["dancer", "choreographer", "instructor"])).optional(),
  gender: z.string().trim().nullable().optional(),
  ethnicity: z.string().trim().nullable().optional(),
  height: z.string().trim().nullable().optional(),
  hairColor: z.string().trim().nullable().optional(),
  eyeColor: z.string().trim().nullable().optional(),
  sizing: z.string().trim().nullable().optional(),
  workingLocations: stringArray.optional(),
  representation: z.string().trim().nullable().optional(),
  agent: z.string().trim().nullable().optional(),
  unionStatus: z.string().trim().nullable().optional(),
  styles: stringArray.optional(),
  skills: stringArray.optional(),
  experiences: z.array(experienceSchema).optional(),
  deferredSetupSkipped: z
    .object({
      sizing: z.boolean().optional(),
      representation: z.boolean().optional(),
      unionStatus: z.boolean().optional(),
    })
    .optional(),
});

export type PersistDeferredProfileInput = z.infer<typeof persistSchema>;

export type PersistDeferredProfileResult =
  | { ok: true }
  | { ok: false; error: string };

function compactObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as Partial<T>;
}

export async function persistDeferredProfileProgress(
  input: PersistDeferredProfileInput,
): Promise<PersistDeferredProfileResult> {
  const parsed = persistSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid profile data." };
  }

  const profile = await requireTalentAccount();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const data = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update(
      compactObject({
        first_name: data.firstName,
        last_name: data.lastName,
        display_name: data.displayName,
        resume_url: data.resumeUrl,
        headshot_urls: data.headshotUrls,
        headshot_original_urls: data.headshotOriginalUrls,
        talent_types: data.talentTypes,
        gender: data.gender,
        ethnicity: data.ethnicity,
        height: data.height,
        hair_color: data.hairColor,
        eye_color: data.eyeColor,
        sizing: data.sizing,
        working_locations: data.workingLocations,
        representation: data.representation,
        agent: data.agent,
        union_status: data.unionStatus,
        styles: data.styles,
        skills: data.skills,
        experiences: data.experiences,
        deferred_setup_skipped: data.deferredSetupSkipped as DeferredSetupSkipped | undefined,
        updated_at: new Date().toISOString(),
      }),
    )
    .eq("user_id", profile.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/profile/setup");
  revalidatePath("/home");
  revalidatePath("/portfolio");
  return { ok: true };
}

export async function finishDeferredProfileSetup(): Promise<PersistDeferredProfileResult> {
  const profile = await requireTalentAccount();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const completedAt = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({
      profile_setup_completed_at: completedAt,
      updated_at: completedAt,
    })
    .eq("user_id", profile.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/profile/setup");
  revalidatePath("/home");
  revalidatePath("/portfolio");
  return { ok: true };
}

export async function submitProfileForReviewAction(): Promise<
  PersistDeferredProfileResult & { status?: string }
> {
  const profile = await requireTalentAccount();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  // Ensure setup stamp exists before submit (iOS writes it before submit explainer).
  await supabase
    .from("profiles")
    .update({
      profile_setup_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", profile.id)
    .is("profile_setup_completed_at", null);

  const { data, error } = await supabase.rpc("submit_profile_for_review");
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/profile/setup");
  revalidatePath("/home");
  revalidatePath("/portfolio");
  return { ok: true, status: typeof data === "string" ? data : "pending" };
}
