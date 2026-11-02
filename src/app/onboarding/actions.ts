"use server";
import { checkAccountDeletionBilling } from "@/lib/billing/account-deletion";

import { getBirthDateAge } from "@/lib/onboarding/birth-date";

import { consumeAuthReturn } from "@/lib/auth/pending-return";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { buildAuthDisplayNameMetadata, isCommunityAccount, isHiringAccount, isMissingShellRpc, isTalentAccount } from "@/lib/auth/profile";
import { getProfileDestination } from "@/lib/auth/session";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { upsertProfessionalProfileDraft, type ProfessionalProfileDraftInput } from "@/lib/professional-profile/actions";
import { syncProfessionalProfile } from "@/lib/professional-profile/sync";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  CancelOnboardingResult,
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
  role: z.enum(["talent", "industry", "community"]),
  accountType: z.enum(["talent", "lookingForTalent", "looking_for_talent", "community"]).nullable(),
  talentTypes: z.array(z.enum(["dancer", "choreographer", "instructor"])).default([]),
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
  acquisitionSource: z
    .enum(["instagram", "friend_or_referral", "motiion_founder", "event", "other", ""])
    .optional(),
  acquisitionSourceDetail: z.string().trim().optional(),
  openProfileSetupAfterComplete: z.boolean().optional(),
});

function compactObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as Partial<T>;
}

async function resolveAvailableUsername(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  desired: string,
) {
  if (!supabase) return desired;

  const base = desired.trim().toLowerCase();
  if (!usernameRegex.test(base)) return base;

  const { data, error } = await supabase.rpc("is_username_available", { candidate: base });
  if (!error && data) return base;

  return null;
}

function formatProfileWriteError(message: string) {
  if (message.includes("profiles_username_lower_unique")) {
    return "That username is already taken. Choose a different username.";
  }

  return message;
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

/** Switch an incomplete signup into the talent-buyer lane before redirecting. */
export async function beginIndustryOnboarding(): Promise<
  | { ok: true; redirectTo: string }
  | { ok: false; error: string }
> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const { data: profile, error: profileReadError } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("user_id", user.id)
    .maybeSingle<{ onboarding_completed_at: string | null }>();

  if (profileReadError) {
    return { ok: false, error: profileReadError.message };
  }

  if (profile?.onboarding_completed_at) {
    return { ok: false, error: "Your profile is already complete." };
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      account_type: "lookingForTalent",
      talent_types: [],
    },
    { onConflict: "user_id" },
  );

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  const { error: nonTalentError } = await supabase.from("non_talent_profiles").upsert(
    {
      id: user.id,
      work_email: user.email ?? null,
      user_type: "talent_buyer",
    },
    { onConflict: "id" },
  );

  if (nonTalentError) {
    return { ok: false, error: nonTalentError.message };
  }

  revalidatePath("/onboarding");
  revalidatePath("/talent-buyers/onboarding");

  return { ok: true, redirectTo: "/talent-buyers/onboarding" };
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

  if (data.role === "talent" && data.headshotUrls.length < 1) {
    return { ok: false, error: "Add at least one headshot before completing setup." };
  }

  if (data.role === "talent" && data.talentTypes.length < 1) {
    return { ok: false, error: "Choose at least one talent type." };
  }

  if (data.role === "industry") {
    return {
      ok: false,
      error: "Industry professionals continue in talent-buyer onboarding.",
    };
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

  const { data: existingProfile, error: profileLookupError } = await supabase
    .from("profiles")
    .select("account_type, onboarding_completed_at")
    .eq("user_id", user.id)
    .maybeSingle<{ account_type: string | null; onboarding_completed_at: string | null }>();
  if (profileLookupError) return { ok: false, error: "Couldn’t load your account. Your draft is saved; please try again." };
  // Replayed submissions must not overwrite a completed profile or rewrite its timestamp.
  if (existingProfile?.onboarding_completed_at && (isTalentAccount(existingProfile.account_type) || isCommunityAccount(existingProfile.account_type))) {
    // A previous attempt can persist the profile and then lose the RPC response.
    // Retry shell activation without overwriting any completed profile fields.
    if (existingProfile.account_type === "talent") {
      const { error } = await supabase.rpc("enable_profile_shell", { p_shell: "talent" });
      if (error && !isMissingShellRpc(error.message)) return { ok: false, error: error.message };
    }
    return { ok: true, redirectTo: await consumeAuthReturn(user.id, "/home") };
  }
  const addingTalentShell =
    isHiringAccount(existingProfile?.account_type) && Boolean(existingProfile?.onboarding_completed_at);
  if (addingTalentShell && data.role !== "talent") {
    return { ok: false, error: "Choose a talent profile to add to your existing industry account." };
  }

  const accountType = data.role === "community" ? "community" : "talent";
  const talentTypes = data.role === "talent" ? data.talentTypes : [];
  const completedAt = existingProfile?.onboarding_completed_at ?? new Date().toISOString();
  const resolvedUsername = await resolveAvailableUsername(supabase, data.username);

  if (!resolvedUsername) {
    return {
      ok: false,
      error: "That username is already taken. Choose a different username.",
    };
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    compactObject({
      user_id: user.id,
      email: user.email ?? data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      display_name: data.displayName,
      account_type: addingTalentShell ? existingProfile!.account_type : accountType,
      ...(accountType === "community" ? { active_shell: "community", enabled_shells: ["community"] } : {}),
      date_of_birth: data.dateOfBirth,
      notifications_enabled: data.notificationsEnabled,
      resume_url: data.resumeUrl || null,
      headshot_urls: data.headshotUrls,
      headshot_original_urls: data.headshotOriginalUrls,
      username: resolvedUsername,
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
      is_private: data.role === "community" ? true : undefined,
      agent: data.agent || null,
      additional_agents: data.additionalRepresentations,
      experiences: data.experiences,
      training: data.training,
      styles: data.styles,
      skills: data.skills,
      profile_highlights: data.profileHighlights,
      profile_visuals: [],
      onboarding_completed_at: completedAt,
      acquisition_source: data.acquisitionSource || null,
      acquisition_source_detail: data.acquisitionSourceDetail || null,
      instagram_url: data.instagramUrl || null,
      x_url: data.xUrl || null,
      tiktok_url: data.tiktokUrl || null,
      whatsapp_url: data.whatsappUrl || null,
      youtube_url: data.youtubeUrl || null,
    }),
    { onConflict: "user_id" },
  );

  if (profileError) {
    return { ok: false, error: formatProfileWriteError(profileError.message) };
  }


  await supabase.auth.updateUser({
    data: {
      has_completed_onboarding: true,
      ...(!addingTalentShell ? { account_type: accountType } : {}),
      ...buildAuthDisplayNameMetadata({
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: data.displayName,
      }),
    },
  });

  await trackServerEvent("onboarding_completed", {
    account_type: accountType,
  });

  if (accountType === "talent") {
    const { error: shellError } = await supabase.rpc("enable_profile_shell", { p_shell: "talent" });
    if (shellError && (addingTalentShell || !isMissingShellRpc(shellError.message))) {
      return { ok: false, error: shellError.message };
    }
    await syncProfessionalProfile(user.id);
    await trackServerEvent("magic_moment_talent_ready", { user_id: user.id });
  }

  revalidatePath("/dashboard");
  revalidatePath("/account");
  revalidatePath("/onboarding");
  revalidatePath("/home");
  revalidatePath("/profile/setup");

  const defaultDestination = getProfileDestination({
    id: user.id,
    email: data.email,
    fullName: data.displayName,
    accountType,
    onboardingCompletedAt: completedAt,
    talentTypes,
    companyName: data.companyName || null,
    nonTalentType: null,
  });

  return {
    ok: true,
    redirectTo:
      accountType === "talent" && data.openProfileSetupAfterComplete
        ? "/profile/setup"
        : await consumeAuthReturn(user.id, defaultDestination),
  };
}

export async function cancelIncompleteSignup(): Promise<CancelOnboardingResult> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("user_id", user.id)
    .maybeSingle<{ onboarding_completed_at: string | null }>();

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  if (profile?.onboarding_completed_at) {
    return { ok: false, error: "Your profile is already complete." };
  }

  const billing = await checkAccountDeletionBilling(user.id);
  if (!billing.ok) return billing;
  const { error: deleteError } = await supabase.rpc("delete_my_account");

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  await supabase.auth.signOut();

  revalidatePath("/onboarding");
  revalidatePath("/signup");

  return { ok: true };
}

/** Save account essentials between steps; this never completes onboarding or grants a shell. */
export async function saveOnboardingEssentials(raw: {
  firstName: string; lastName: string; dateOfBirth: string; displayName: string;
  username: string; headshotUrls: string[]; headshotOriginalUrls: string[];
  acquisitionSource: string; acquisitionSourceDetail: string;
  role: "talent" | "industry" | "community" | null; talentTypes: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = z.object({
    firstName: z.string().trim().max(200), lastName: z.string().trim().max(200), displayName: z.string().trim().max(200),
    dateOfBirth: z.string().max(10), username: z.string().max(30),
    headshotUrls: z.array(z.string().url().max(2000)).max(4), headshotOriginalUrls: z.array(z.string().url().max(2000)).max(4),
    acquisitionSource: z.string().max(50), acquisitionSourceDetail: z.string().max(2000),
    role: z.enum(["talent", "industry", "community"]).nullable(), talentTypes: z.array(z.enum(["dancer", "choreographer", "instructor"])).max(3),
  }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Check your account details and try again." };
  const input = parsed.data;
  const db = await createServerSupabaseClient();
  if (!db) return { ok: false, error: "Couldn’t save your progress. Please try again." };
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Sign in again to continue. Your draft is saved on this device." };
  const { data: profile, error: lookupError } = await db.from("profiles").select("onboarding_completed_at").eq("user_id", user.id).single();
  if (lookupError) return { ok: false, error: "Couldn’t load your account. Please try again." };
  // Adding a talent shell must not overwrite an existing professional's identity here.
  if (profile.onboarding_completed_at) return { ok: true };
  const update: Record<string, unknown> = {};
  if (input.role === "talent" && input.talentTypes.length) { update.account_type = "talent"; update.talent_types = input.talentTypes; }
  if (input.role === "community") { update.account_type = "community"; update.talent_types = []; }
  if (input.firstName.trim() && input.lastName.trim()) { update.first_name = input.firstName.trim().slice(0, 200); update.last_name = input.lastName.trim().slice(0, 200); }
  if (input.displayName.trim()) update.display_name = input.displayName.trim().slice(0, 200);
  if (input.dateOfBirth && getBirthDateAge(input.dateOfBirth) >= 18) update.date_of_birth = input.dateOfBirth;
  if (usernameRegex.test(input.username)) update.username = input.username;
  // Only persist this account's own uploaded media; the upload storage policy remains authoritative.
  const ownHeadshot = (url: string) => { try { const value = new URL(url); return value.protocol === "https:" && value.pathname.startsWith(`/storage/v1/object/public/headshots/${user.id}/`); } catch { return false; } };
  if (input.headshotUrls.length && input.headshotUrls.length <= 4 && input.headshotUrls.every(ownHeadshot)) update.headshot_urls = input.headshotUrls;
  if (input.headshotOriginalUrls.length && input.headshotOriginalUrls.length <= 4 && input.headshotOriginalUrls.every(ownHeadshot)) update.headshot_original_urls = input.headshotOriginalUrls;
  if (["instagram", "friend_or_referral", "motiion_founder", "event", "other"].includes(input.acquisitionSource)) { update.acquisition_source = input.acquisitionSource; update.acquisition_source_detail = input.acquisitionSourceDetail.slice(0, 2000); }
  if (!Object.keys(update).length) return { ok: true };
  const { error } = await db.from("profiles").update(update).eq("user_id", user.id).is("onboarding_completed_at", null);
  if (error) return { ok: false, error: formatProfileWriteError(error.message) };
  return { ok: true };
}
