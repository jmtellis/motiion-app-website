import { getProfileAvatarUrl } from "@/lib/auth/avatar";
import { BUYER_HOME_PATH } from "@/lib/talent-buyers/dashboard-data";
import type {
  AccountType,
  DashboardProfile,
  NonTalentProfileRecord,
  ProfileRecord,
} from "@/types/database";

export function normalizeAccountType(value: string | null | undefined): AccountType | null {
  if (!value) return null;
  if (value === "looking_for_talent" || value === "lookingForTalent") return value as AccountType;
  if (value === "talent") return value;
  return null;
}

export function isTalentAccount(accountType: string | null | undefined) {
  return normalizeAccountType(accountType) === "talent";
}

export function isHiringAccount(accountType: string | null | undefined) {
  const normalized = normalizeAccountType(accountType);
  return normalized === "looking_for_talent" || normalized === "lookingForTalent";
}

export function isOnboardingComplete(
  profile: Pick<DashboardProfile, "accountType" | "onboardingCompletedAt"> | null | undefined,
) {
  if (!profile?.onboardingCompletedAt) return false;
  return isTalentAccount(profile.accountType) || isHiringAccount(profile.accountType);
}

export function getOnboardingPath(profile: Pick<DashboardProfile, "accountType"> | null | undefined) {
  if (isHiringAccount(profile?.accountType)) {
    return "/talent-buyers/onboarding";
  }

  return "/onboarding";
}

export function getProfileDestination(profile: DashboardProfile | null) {
  if (!profile) return "/login";
  if (!isOnboardingComplete(profile)) return getOnboardingPath(profile);
  if (isHiringAccount(profile.accountType)) return BUYER_HOME_PATH;
  if (isTalentAccount(profile.accountType)) return "/home";
  return "/onboarding";
}

export function getFullName(profile: Pick<ProfileRecord, "display_name" | "first_name" | "last_name">) {
  const fallback = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  return profile.display_name || fallback || "Motiion User";
}

export function toDashboardProfile(
  profile: ProfileRecord,
  nonTalentProfile?: NonTalentProfileRecord | null,
): DashboardProfile {
  return {
    id: profile.user_id,
    email: profile.email,
    fullName: getFullName(profile),
    accountType: normalizeAccountType(profile.account_type),
    onboardingCompletedAt: profile.onboarding_completed_at ?? null,
    talentTypes: profile.talent_types ?? null,
    companyName: nonTalentProfile?.company_name ?? nonTalentProfile?.organization_name ?? null,
    nonTalentType: nonTalentProfile?.non_talent_type ?? null,
    username: profile.username ?? null,
    avatarUrl: getProfileAvatarUrl(profile.headshot_urls),
    userType: nonTalentProfile?.user_type ?? null,
    primaryGoal: nonTalentProfile?.primary_goal ?? null,
    buyerRole: nonTalentProfile?.role ?? null,
    organizationName: nonTalentProfile?.organization_name ?? nonTalentProfile?.company_name ?? null,
    organizationWebsite: nonTalentProfile?.organization_website ?? null,
    companySize: nonTalentProfile?.company_size ?? null,
    buyerTalentTypes: nonTalentProfile?.talent_types ?? null,
    styleFocus: nonTalentProfile?.style_focus ?? null,
    markets: nonTalentProfile?.markets ?? null,
    verificationLinks: nonTalentProfile?.verification_links ?? null,
    notificationPreferences: nonTalentProfile?.notification_preferences ?? null,
    buyerOnboardingCompleted: nonTalentProfile?.onboarding_completed ?? null,
  };
}
