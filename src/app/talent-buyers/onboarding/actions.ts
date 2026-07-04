"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getProfileDestination } from "@/lib/auth/session";
import { isAtLeast18 } from "@/lib/auth/age";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { mapBuyerRoleToLegacyNonTalentType } from "@/lib/talent-buyers/roles";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  CompleteTalentBuyerOnboardingPayload,
  CompleteTalentBuyerOnboardingResult,
} from "@/types/talent-buyers";

const stringArraySchema = z.array(z.string().trim().min(1)).default([]);

function orgSlug(name: string, userId: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base ? `${base}-${userId.slice(0, 6)}` : `org-${userId.slice(0, 8)}`;
}

/** Create the buyer's organization + default team and add them as owner (idempotent). */
async function ensureBuyerOrganization(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  userId: string,
  organizationName: string,
  organizationWebsite: string | null,
): Promise<void> {
  const { data: existingMembership } = await supabase
    .from("team_members")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (existingMembership) return;

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: organizationName,
      slug: orgSlug(organizationName, userId),
      website: organizationWebsite,
      created_by: userId,
    })
    .select("id")
    .single();
  if (orgError || !org) return;

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({ organization_id: org.id, name: "General" })
    .select("id")
    .single();
  if (teamError || !team) return;

  await supabase.from("team_members").insert({
    team_id: team.id,
    user_id: userId,
    role: "owner",
  });
}

const verificationLinksSchema = z
  .object({
    companyWebsite: z.string().trim().optional(),
    linkedin: z.string().trim().optional(),
    instagram: z.string().trim().optional(),
  })
  .default({});

const notificationPreferencesSchema = z.object({
  newTalentMatches: z.boolean(),
  opportunityUpdates: z.boolean(),
  industryAnnouncements: z.boolean(),
});

const talentBuyerPayloadSchema = z.object({
  version: z.literal(1),
  userId: z.string().uuid(),
  currentStep: z.string(),
  dateOfBirth: z.string().trim().min(1, "Date of birth is required."),
  primaryGoal: z.enum(["find_talent", "post_opportunities", "manage_talent", "everything"]),
  role: z.enum([
    "casting_director",
    "choreographer",
    "creative_director",
    "producer",
    "talent_agency",
    "studio_owner",
    "dance_company",
    "brand",
    "production_company",
    "event_organizer",
    "other",
  ]),
  organizationName: z.string().trim().min(1, "Organization name is required."),
  organizationWebsite: z.string().trim().optional(),
  companySize: z.enum(["just_me", "2_10", "11_50", "51_200", "200_plus"]),
  talentTypes: stringArraySchema.refine((values) => values.length > 0, {
    message: "Select at least one talent type.",
  }),
  styleFocus: stringArraySchema.refine((values) => values.length > 0, {
    message: "Select at least one style.",
  }),
  markets: stringArraySchema.refine((values) => values.length > 0, {
    message: "Add at least one market.",
  }),
  verificationLinks: verificationLinksSchema,
  notificationPreferences: notificationPreferencesSchema,
});

export async function completeTalentBuyerOnboarding(
  payload: CompleteTalentBuyerOnboardingPayload,
): Promise<CompleteTalentBuyerOnboardingResult> {
  const parsed = talentBuyerPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check your onboarding details.",
    };
  }

  const data = parsed.data;

  if (!isAtLeast18(data.dateOfBirth)) {
    return { ok: false, error: "You must be at least 18 to join Motiion." };
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

  const completedAt = new Date().toISOString();
  const email = user.email ?? "";

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("first_name, last_name, display_name")
    .eq("user_id", user.id)
    .maybeSingle<{
      first_name: string | null;
      last_name: string | null;
      display_name: string | null;
    }>();

  if (!existingProfile) {
    return { ok: false, error: "Profile not found. Please sign up again." };
  }

  const fullName =
    existingProfile.display_name ||
    [existingProfile.first_name, existingProfile.last_name].filter(Boolean).join(" ").trim() ||
    "Motiion User";

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      email,
      first_name: existingProfile.first_name,
      last_name: existingProfile.last_name,
      display_name: fullName,
      date_of_birth: data.dateOfBirth,
      account_type: "lookingForTalent",
      onboarding_completed_at: completedAt,
      notification_preferences: data.notificationPreferences,
    },
    { onConflict: "user_id" },
  );

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  const legacyNonTalentType = mapBuyerRoleToLegacyNonTalentType(data.role);

  const { error: buyerError } = await supabase.from("non_talent_profiles").upsert(
    {
      id: user.id,
      work_email: email,
      user_type: "talent_buyer",
      company_name: data.organizationName,
      ...(legacyNonTalentType ? { non_talent_type: legacyNonTalentType } : {}),
      primary_goal: data.primaryGoal,
      role: data.role,
      organization_name: data.organizationName,
      organization_website: data.organizationWebsite || null,
      company_size: data.companySize,
      talent_types: data.talentTypes,
      style_focus: data.styleFocus,
      markets: data.markets,
      verification_links: data.verificationLinks,
      notification_preferences: data.notificationPreferences,
      onboarding_completed: true,
    },
    { onConflict: "id" },
  );

  if (buyerError) {
    return { ok: false, error: buyerError.message };
  }

  await ensureBuyerOrganization(supabase, user.id, data.organizationName, data.organizationWebsite || null);

  await supabase.auth.updateUser({
    data: {
      has_completed_onboarding: true,
    },
  });

  await trackServerEvent("onboarding_completed", {
    account_type: "lookingForTalent",
    user_type: "talent_buyer",
    primary_goal: data.primaryGoal,
    role: data.role,
  });

  revalidatePath("/dashboard");
  revalidatePath("/home");
  revalidatePath("/talent-buyers/onboarding");

  return {
    ok: true,
    redirectTo: getProfileDestination({
      id: user.id,
      email,
      fullName,
      accountType: "lookingForTalent",
      onboardingCompletedAt: completedAt,
      talentTypes: [],
      companyName: data.organizationName,
      nonTalentType: null,
      userType: "talent_buyer",
      primaryGoal: data.primaryGoal,
      buyerRole: data.role,
    }),
  };
}
