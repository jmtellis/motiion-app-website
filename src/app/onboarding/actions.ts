"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getProfileDestination } from "@/lib/auth/session";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { upsertProfessionalProfileDraft, type ProfessionalProfileDraftInput } from "@/lib/professional-profile/actions";
import { syncProfessionalProfile } from "@/lib/professional-profile/sync";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  CompleteOnboardingPayload,
  CompleteOnboardingResult,
  UsernameAvailabilityResult,
} from "@/types/onboarding";

const usernameRegex = /^[a-z0-9_]{3,30}$/;

const stringArraySchema = z.array(z.string().trim().min(1)).default([]);

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

const trainingSchema = z.object({
  name: z.string().trim().min(1),
  program: z.string().trim().optional(),
  start_year: z.string().trim().optional(),
  end_year: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

const highlightSchema = z.object({
  title: z.string().trim().min(1),
  subtitle: z.string().trim().optional(),
});

const onboardingPayloadSchema = z.object({
  version: z.literal(1),
  userId: z.string().uuid(),
  currentStep: z.string(),
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  email: z.string().trim().email("A valid email is required."),
  dateOfBirth: z.string().trim().min(1, "Date of birth is required."),
  notificationsEnabled: z.boolean(),
  role: z.enum(["dancer", "choreographer", "hiring"]),
  accountType: z.enum(["talent", "lookingForTalent", "looking_for_talent"]).nullable(),
  talentTypes: z.array(z.enum(["dancer", "choreographer"])).default([]),
  displayName: z.string().trim().min(1, "Display name is required."),
  username: z.string().trim().toLowerCase().regex(usernameRegex, "Use 3-30 lowercase letters, numbers, or underscores."),
  headshotUrls: stringArraySchema,
  headshotOriginalUrls: stringArraySchema,
  resumeUrl: z.string().trim().optional(),
  gender: z.string().trim().optional(),
  ethnicity: z.string().trim().optional(),
  height: z.string().trim().optional(),
  hairColor: z.string().trim().optional(),
  eyeColor: z.string().trim().optional(),
  sizing: z.string().trim().optional(),
  workingLocations: stringArraySchema,
  representation: z.string().trim().optional(),
  unionStatus: z.string().trim().optional(),
  unionMemberId: z.string().trim().optional(),
  agent: z.string().trim().optional(),
  additionalRepresentations: stringArraySchema,
  styles: stringArraySchema,
  skills: stringArraySchema,
  training: z.array(trainingSchema).default([]),
  experiences: z.array(experienceSchema).default([]),
  profileHighlights: z.array(highlightSchema).default([]),
  instagramUrl: z.string().trim().optional(),
  xUrl: z.string().trim().optional(),
  tiktokUrl: z.string().trim().optional(),
  whatsappUrl: z.string().trim().optional(),
  youtubeUrl: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  nonTalentType: z.string().trim().optional(),
  hiringBio: z.string().trim().optional(),
});

function compactObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as Partial<T>;
}

function getBirthDateAge(dateOfBirth: string) {
  const birthDate = new Date(dateOfBirth);

  if (Number.isNaN(birthDate.getTime())) {
    return 0;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age;
}

export async function checkUsernameAvailability(
  username: string,
): Promise<UsernameAvailabilityResult> {
  const normalized = username.trim().toLowerCase();

  if (!usernameRegex.test(normalized)) {
    return {
      ok: false,
      available: false,
      message: "Use 3-30 lowercase letters, numbers, or underscores.",
    };
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      ok: false,
      available: false,
      message: "Supabase is not configured.",
    };
  }

  const { data, error } = await supabase.rpc("is_username_available", {
    candidate: normalized,
  });

  if (error) {
    return {
      ok: false,
      available: false,
      message: error.message,
    };
  }

  return {
    ok: true,
    available: Boolean(data),
    message: data ? "Username is available." : "That username is already taken.",
  };
}

export async function syncOnboardingProfessionalDraft(input: ProfessionalProfileDraftInput) {
  return upsertProfessionalProfileDraft(input);
}

export async function completeOnboarding(
  payload: CompleteOnboardingPayload,
): Promise<CompleteOnboardingResult> {
  const parsed = onboardingPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check your onboarding details.",
    };
  }

  const data = parsed.data;

  if (getBirthDateAge(data.dateOfBirth) < 18) {
    return { ok: false, error: "You must be at least 18 to join Motiion." };
  }

  if (data.role !== "hiring" && data.headshotUrls.length < 1) {
    return { ok: false, error: "Add at least one headshot URL before completing setup." };
  }

  if (data.role === "hiring" && !data.companyName) {
    return { ok: false, error: "Company or organization is required." };
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== data.userId) {
    return { ok: false, error: "You must be signed in to finish onboarding." };
  }

  const accountType = data.role === "hiring" ? "lookingForTalent" : "talent";
  const talentTypes =
    data.role === "hiring"
      ? []
      : [data.role === "choreographer" ? "choreographer" : "dancer"];
  const completedAt = new Date().toISOString();

  const { error: profileError } = await supabase.from("profiles").upsert(
    compactObject({
      user_id: user.id,
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      display_name: data.displayName,
      account_type: accountType,
      date_of_birth: data.dateOfBirth,
      notifications_enabled: data.notificationsEnabled,
      resume_url: data.resumeUrl || null,
      headshot_urls: data.headshotUrls,
      headshot_original_urls: data.headshotOriginalUrls,
      username: data.username,
      height: data.height || null,
      ethnicity: data.ethnicity || null,
      hair_color: data.hairColor || null,
      eye_color: data.eyeColor || null,
      gender: data.gender || null,
      sizing: data.sizing || null,
      working_locations: data.workingLocations,
      representation: data.representation || null,
      union_status: data.unionStatus || null,
      union_member_id: data.unionMemberId || null,
      talent_types: talentTypes,
      agent: data.agent || null,
      additional_representations: data.additionalRepresentations,
      experiences: data.experiences,
      training: data.training,
      styles: data.styles,
      skills: data.skills,
      profile_highlights: data.profileHighlights,
      profile_visuals: [],
      onboarding_completed_at: completedAt,
      instagram_url: data.instagramUrl || null,
      x_url: data.xUrl || null,
      tiktok_url: data.tiktokUrl || null,
      whatsapp_url: data.whatsappUrl || null,
      youtube_url: data.youtubeUrl || null,
    }),
    { onConflict: "user_id" },
  );

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  if (data.role === "hiring") {
    const { error: nonTalentError } = await supabase
      .from("non_talent_profiles")
      .upsert(
        {
          id: user.id,
          company_name: data.companyName || null,
          non_talent_type: data.nonTalentType || null,
          work_email: data.email,
        },
        { onConflict: "id" },
      );

    if (nonTalentError) {
      return { ok: false, error: nonTalentError.message };
    }
  }

  await supabase.auth.updateUser({
    data: {
      has_completed_onboarding: true,
    },
  });

  await trackServerEvent("onboarding_completed", {
    account_type: accountType,
  });

  if (accountType === "talent") {
    await syncProfessionalProfile(user.id);
    await trackServerEvent("magic_moment_talent_ready", { user_id: user.id });
  }

  revalidatePath("/dashboard");
  revalidatePath("/account");
  revalidatePath("/onboarding");

  return {
    ok: true,
    redirectTo: getProfileDestination({
      id: user.id,
      email: data.email,
      fullName: data.displayName,
      accountType,
      onboardingCompletedAt: completedAt,
      talentTypes,
      companyName: data.companyName || null,
      nonTalentType: null,
    }),
  };
}
