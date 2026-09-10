import type { SupabaseClient, User } from "@supabase/supabase-js";

import {
  getFullName,
  getOnboardingPath,
  getProfileDestination,
  isOnboardingComplete,
  toDashboardProfile,
} from "@/lib/auth/profile";
import {
  signupIntentFromUserMetadata,
  type OAuthSignupIntent,
} from "@/lib/auth/oauth-shared";
import type { NonTalentProfileRecord, ProfileRecord } from "@/types/database";

function parseNameFromUser(user: User) {
  const metadata = user.user_metadata ?? {};
  const fullName =
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    "";

  const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName =
    (typeof metadata.given_name === "string" && metadata.given_name) ||
    (typeof metadata.first_name === "string" && metadata.first_name) ||
    nameParts[0] ||
    "";
  const lastName =
    (typeof metadata.family_name === "string" && metadata.family_name) ||
    (typeof metadata.last_name === "string" && metadata.last_name) ||
    nameParts.slice(1).join(" ") ||
    "";

  const displayName =
    fullName.trim() ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    user.email?.split("@")[0] ||
    "Motiion User";

  return { firstName, lastName, displayName };
}

/**
 * Ensure a Motiion profiles row exists after auth.
 * Creates on explicit signup intent OR when auth metadata carries a signup lane
 * (email confirmation often loses `flow=signup` from the redirect URL).
 */
export async function ensureOAuthProfile(
  supabase: SupabaseClient,
  user: User,
  intent: OAuthSignupIntent,
): Promise<{ created: boolean }> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("user_id, account_type, onboarding_completed_at")
    .eq("user_id", user.id)
    .maybeSingle<Pick<ProfileRecord, "user_id" | "account_type" | "onboarding_completed_at">>();

  if (existing) {
    return { created: false };
  }

  const metadataIntent = signupIntentFromUserMetadata(user);
  const canCreateFromSignup = intent.flow === "signup" || Boolean(metadataIntent);
  if (!canCreateFromSignup) {
    // Login must never auto-create a Motiion profile for unknown identities.
    return { created: false };
  }

  const resolvedIntent: OAuthSignupIntent = {
    ...intent,
    flow: "signup",
    accountType: metadataIntent?.accountType ?? intent.accountType,
  };

  const email = user.email ?? "";
  const { firstName, lastName, displayName } = parseNameFromUser(user);
  const accountType = resolvedIntent.accountType;

  const { error: profileError } = await supabase.from("profiles").upsert({
    user_id: user.id,
    email,
    first_name: firstName,
    last_name: lastName,
    display_name: displayName,
    account_type: accountType,
    talent_types:
      accountType === "talent" && resolvedIntent.talentSubtype
        ? [resolvedIntent.talentSubtype]
        : [],
    working_locations: [],
    skills: [],
    experiences: [],
    training: [],
    headshot_urls: [],
  });

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (accountType === "lookingForTalent") {
    const { error: nonTalentError } = await supabase.from("non_talent_profiles").upsert({
      id: user.id,
      company_name: resolvedIntent.companyName?.trim() || null,
      non_talent_type: resolvedIntent.nonTalentType || null,
      work_email: email,
      user_type: "talent_buyer",
    });

    if (nonTalentError) {
      throw new Error(nonTalentError.message);
    }
  }

  return { created: true };
}

export async function resolveOAuthRedirectPath(
  supabase: SupabaseClient,
  userId: string,
  intent: OAuthSignupIntent,
  user?: User | null,
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "user_id, email, first_name, last_name, display_name, account_type, username, talent_types, headshot_urls, onboarding_completed_at",
    )
    .eq("user_id", userId)
    .maybeSingle<ProfileRecord>();

  if (!profile) {
    return "/signup";
  }

  const { data: nonTalentProfile } = await supabase
    .from("non_talent_profiles")
    .select(
      "id, company_name, non_talent_type, work_email, user_type, primary_goal, role, custom_role, platform_goals, work_types, custom_work_type, organization_name, organization_website, organization_relationship, organization_brand_domain, company_size, talent_types, style_focus, markets, verification_links, notification_preferences, onboarding_completed, onboarding_step",
    )
    .eq("id", userId)
    .maybeSingle<NonTalentProfileRecord>();

  const dashboardProfile = toDashboardProfile(profile, nonTalentProfile);

  if (!isOnboardingComplete(dashboardProfile)) {
    return getOnboardingPath(dashboardProfile);
  }

  return getProfileDestination(dashboardProfile);
}

export function displayNameFromProfile(profile: ProfileRecord | null, user: User) {
  if (profile) return getFullName(profile);
  return parseNameFromUser(user).displayName;
}
