"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getProfileDestination } from "@/lib/auth/session";
import { isAtLeast18 } from "@/lib/auth/age";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { getIndustryIdentityVerificationByUserId } from "@/lib/billing/identity";
import { defaultBuyerNotificationPreferences, marketsFromPlaces } from "@/lib/talent-buyers/onboarding";
import { mapBuyerRoleToLegacyNonTalentType } from "@/lib/talent-buyers/roles";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  CompleteTalentBuyerOnboardingPayload,
  CompleteTalentBuyerOnboardingResult,
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

const talentBuyerPayloadSchema = z.object({
  version: z.literal(2),
  userId: z.string().uuid(),
  currentStep: z.string(),
  dateOfBirth: z.string().trim().min(1, "Date of birth is required."),
  fullName: z.string().trim().min(1, "Name is required."),
  contactEmail: z.string().trim().email("Enter a valid contact email."),
  avatarUrl: z.string().trim().min(1, "Add a profile photo to continue."),
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
  markets: z.array(z.string().trim().min(1)).default([]),
  marketPlaces: z.array(marketPlaceSchema).min(1, "Add at least one market."),
  verificationLinks: z
    .object({
      companyWebsite: z.string().trim().optional(),
      linkedin: z.string().trim().optional(),
      instagram: z.string().trim().optional(),
    })
    .default({}),
  notificationPreferences: z
    .object({
      newTalentMatches: z.boolean(),
      opportunityUpdates: z.boolean(),
      industryAnnouncements: z.boolean(),
    })
    .default(defaultBuyerNotificationPreferences),
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

  const identity = await getIndustryIdentityVerificationByUserId(user.id);
  if (!identity || identity.status !== "verified") {
    return { ok: false, error: "Complete identity verification to finish setup." };
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

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("headshot_urls")
    .eq("user_id", user.id)
    .maybeSingle<{ headshot_urls: string[] | null }>();

  const headshotUrls = Array.isArray(existingProfile?.headshot_urls)
    ? [...existingProfile.headshot_urls]
    : [];
  if (data.avatarUrl && headshotUrls[0] !== data.avatarUrl) {
    headshotUrls[0] = data.avatarUrl;
  }

  if (!headshotUrls[0]) {
    return { ok: false, error: "Add a profile photo to continue." };
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      email: contactEmail,
      first_name: firstName,
      last_name: lastName || null,
      display_name: fullName,
      date_of_birth: data.dateOfBirth,
      account_type: "lookingForTalent",
      headshot_urls: headshotUrls,
      onboarding_completed_at: completedAt,
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
      work_email: contactEmail,
      user_type: "talent_buyer",
      company_name: data.organizationName,
      ...(legacyNonTalentType ? { non_talent_type: legacyNonTalentType } : {}),
      primary_goal: data.primaryGoal,
      role: data.role,
      organization_name: data.organizationName,
      organization_website: data.organizationWebsite || null,
      company_size: data.companySize,
      talent_types: [],
      style_focus: [],
      markets: marketLabels,
      market_places: data.marketPlaces,
      verification_links: {},
      notification_preferences: notificationPreferences,
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
    identity_verified: true,
  });

  revalidatePath("/dashboard");
  revalidatePath("/home");
  revalidatePath("/talent-buyers/onboarding");

  return {
    ok: true,
    redirectTo: getProfileDestination({
      id: user.id,
      email: contactEmail,
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
