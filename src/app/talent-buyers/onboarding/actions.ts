"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { trackServerEvent } from "@/lib/analytics/track-server";
import { buildAuthDisplayNameMetadata } from "@/lib/auth/profile";
import {
  defaultBuyerNotificationPreferences,
  deriveLegacyPrimaryGoal,
  marketsFromPlaces,
  resolveIndustryPrimaryAction,
} from "@/lib/talent-buyers/onboarding";
import { mapBuyerRoleToLegacyNonTalentType } from "@/lib/talent-buyers/roles";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  CompleteTalentBuyerOnboardingPayload,
  CompleteTalentBuyerOnboardingResult,
  SaveTalentBuyerOnboardingProgressResult,
  TalentBuyerOnboardingDraft,
} from "@/types/talent-buyers";

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

const marketPlaceSchema = z.object({
  placeId: z.string().trim().min(1),
  city: z.string().trim().nullable(),
  region: z.string().trim().nullable(),
  country: z.string().trim().nullable(),
  displayLabel: z.string().trim().min(1),
});

const roleEnum = z.enum([
  "choreographer",
  "casting_professional",
  "creative_director_or_producer",
  "talent_representative",
  "brand_or_agency_professional",
  "other",
  "casting_director",
  "creative_director",
  "producer",
  "talent_agency",
  "studio_owner",
  "dance_company",
  "brand",
  "production_company",
  "event_organizer",
]);

const platformGoalEnum = z.enum([
  "find_dancers",
  "run_a_casting",
  "manage_talent",
  "build_a_roster",
  "staff_a_project",
  "coordinate_bookings",
  "just_exploring",
]);

const workTypeEnum = z.enum([
  "music_or_touring",
  "film_or_television",
  "commercial_or_branded",
  "live_events",
  "classes_or_training",
  "representation",
  "other",
]);

const organizationRelationshipEnum = z.enum(["organization", "independent", "multiple"]);

const talentBuyerPayloadSchema = z.object({
  version: z.literal(3),
  userId: z.string().uuid(),
  currentStep: z.string(),
  fullName: z.string().trim().min(1, "Name is required."),
  contactEmail: z.string().trim().email("Enter a valid work email."),
  role: roleEnum,
  customRole: z.string().trim().default(""),
  platformGoals: z.array(platformGoalEnum).min(1, "Select at least one goal."),
  workTypes: z.array(workTypeEnum).default([]),
  customWorkType: z.string().trim().default(""),
  organizationRelationship: organizationRelationshipEnum,
  organizationName: z.string().trim().default(""),
  organizationWebsite: z.string().trim().optional(),
  organizationBrandDomain: z.string().trim().default(""),
  markets: z.array(z.string().trim().min(1)).default([]),
  marketPlaces: z.array(marketPlaceSchema).min(1, "Add your primary market."),
  notificationPreferences: z
    .object({
      newTalentMatches: z.boolean(),
      opportunityUpdates: z.boolean(),
      industryAnnouncements: z.boolean(),
    })
    .default(defaultBuyerNotificationPreferences),
});

const progressPayloadSchema = talentBuyerPayloadSchema.partial().extend({
  version: z.literal(3),
  userId: z.string().uuid(),
  currentStep: z.string(),
});

function resolvedOrganizationName(data: {
  organizationRelationship: "organization" | "independent" | "multiple";
  organizationName: string;
  fullName: string;
}): string {
  if (data.organizationRelationship === "independent") {
    return data.organizationName.trim() || `${data.fullName.trim()}'s Workspace`;
  }
  return data.organizationName.trim();
}

export async function saveTalentBuyerOnboardingProgress(
  payload: TalentBuyerOnboardingDraft,
): Promise<SaveTalentBuyerOnboardingProgressResult> {
  const parsed = progressPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Could not save progress.",
    };
  }

  const data = parsed.data;
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== data.userId) {
    return { ok: false, error: "You must be signed in to save progress." };
  }

  const contactEmail = data.contactEmail?.trim().toLowerCase();
  const fullName = data.fullName?.trim();
  const nameParts = fullName?.split(/\s+/) ?? [];
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");

  if (fullName || contactEmail) {
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        ...(contactEmail ? { email: contactEmail } : {}),
        ...(fullName
          ? {
              first_name: firstName,
              last_name: lastName || null,
              display_name: fullName,
            }
          : {}),
        account_type: "lookingForTalent",
      },
      { onConflict: "user_id" },
    );
    if (profileError) {
      return { ok: false, error: profileError.message };
    }
  }

  const marketLabels =
    data.marketPlaces?.length
      ? marketsFromPlaces(data.marketPlaces)
      : data.markets ?? [];

  const { error: buyerError } = await supabase.from("non_talent_profiles").upsert(
    {
      id: user.id,
      user_type: "talent_buyer",
      onboarding_step: data.currentStep,
      ...(contactEmail ? { work_email: contactEmail } : {}),
      ...(data.role
        ? {
            role: data.role,
            ...(mapBuyerRoleToLegacyNonTalentType(data.role)
              ? { non_talent_type: mapBuyerRoleToLegacyNonTalentType(data.role) }
              : {}),
          }
        : {}),
      ...(data.customRole !== undefined ? { custom_role: data.customRole || null } : {}),
      ...(data.platformGoals
        ? {
            platform_goals: data.platformGoals,
            primary_goal: deriveLegacyPrimaryGoal(data.platformGoals),
          }
        : {}),
      ...(data.workTypes ? { work_types: data.workTypes } : {}),
      ...(data.customWorkType !== undefined
        ? { custom_work_type: data.customWorkType || null }
        : {}),
      ...(data.organizationRelationship
        ? { organization_relationship: data.organizationRelationship }
        : {}),
      ...(data.organizationName !== undefined
        ? {
            organization_name: data.organizationName || null,
            company_name: data.organizationName || null,
          }
        : {}),
      ...(data.organizationWebsite !== undefined
        ? { organization_website: data.organizationWebsite || null }
        : {}),
      ...(data.organizationBrandDomain !== undefined
        ? { organization_brand_domain: data.organizationBrandDomain || null }
        : {}),
      ...(data.marketPlaces
        ? {
            market_places: data.marketPlaces,
            markets: marketLabels,
          }
        : {}),
      onboarding_completed: false,
    },
    { onConflict: "id" },
  );

  if (buyerError) {
    return { ok: false, error: buyerError.message };
  }

  return { ok: true };
}

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

  if (data.role === "other" && !data.customRole.trim()) {
    return { ok: false, error: "Tell us your role." };
  }

  if (
    (data.organizationRelationship === "organization" ||
      data.organizationRelationship === "multiple") &&
    !data.organizationName.trim()
  ) {
    return { ok: false, error: "Select or enter your organization." };
  }

  if (data.workTypes.includes("other") && !data.customWorkType.trim()) {
    return { ok: false, error: "Tell us what kind of work you’re hiring for." };
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
  const contactEmail = data.contactEmail.trim().toLowerCase();
  const nameParts = data.fullName.trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");
  const fullName = data.fullName.trim();
  const marketLabels =
    data.markets.length > 0 ? data.markets : marketsFromPlaces(data.marketPlaces);
  const notificationPreferences = {
    ...defaultBuyerNotificationPreferences,
    ...data.notificationPreferences,
  };
  const organizationName = resolvedOrganizationName(data);
  const legacyPrimaryGoal = deriveLegacyPrimaryGoal(data.platformGoals);
  const primaryAction = resolveIndustryPrimaryAction(data.platformGoals);
  const legacyNonTalentType = mapBuyerRoleToLegacyNonTalentType(data.role);

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      email: contactEmail,
      first_name: firstName,
      last_name: lastName || null,
      display_name: fullName,
      account_type: "lookingForTalent",
      onboarding_completed_at: completedAt,
    },
    { onConflict: "user_id" },
  );

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  const { error: buyerError } = await supabase.from("non_talent_profiles").upsert(
    {
      id: user.id,
      work_email: contactEmail,
      user_type: "talent_buyer",
      company_name: organizationName,
      ...(legacyNonTalentType ? { non_talent_type: legacyNonTalentType } : {}),
      primary_goal: legacyPrimaryGoal,
      role: data.role,
      custom_role: data.role === "other" ? data.customRole.trim() : null,
      platform_goals: data.platformGoals,
      work_types: data.workTypes,
      custom_work_type: data.workTypes.includes("other") ? data.customWorkType.trim() : null,
      organization_name: organizationName,
      organization_website: data.organizationWebsite || null,
      organization_relationship: data.organizationRelationship,
      organization_brand_domain: data.organizationBrandDomain || null,
      talent_types: [],
      style_focus: [],
      markets: marketLabels,
      market_places: data.marketPlaces,
      verification_links: {},
      notification_preferences: notificationPreferences,
      onboarding_step: "success",
      onboarding_completed: true,
    },
    { onConflict: "id" },
  );

  if (buyerError) {
    return { ok: false, error: buyerError.message };
  }

  if (data.organizationRelationship !== "independent" || organizationName) {
    await ensureBuyerOrganization(
      supabase,
      user.id,
      organizationName,
      data.organizationWebsite || null,
    );
  }

  await supabase.auth.updateUser({
    data: {
      has_completed_onboarding: true,
      ...buildAuthDisplayNameMetadata({
        firstName,
        lastName,
        displayName: fullName,
      }),
    },
  });

  await trackServerEvent("onboarding_completed", {
    account_type: "lookingForTalent",
    user_type: "talent_buyer",
    primary_goal: legacyPrimaryGoal,
    platform_goals: data.platformGoals,
    role: data.role,
    primary_action: primaryAction.id,
  });

  await trackServerEvent("industry_onboarding_completed", {
    role: data.role,
    platform_goals: data.platformGoals,
    work_types: data.workTypes,
    organization_relationship: data.organizationRelationship,
    primary_action: primaryAction.id,
  });

  revalidatePath("/dashboard");
  revalidatePath("/home");
  revalidatePath("/projects");
  revalidatePath("/talent");
  revalidatePath("/library");
  revalidatePath("/talent-buyers/onboarding");

  return {
    ok: true,
    redirectTo: primaryAction.href,
  };
}
