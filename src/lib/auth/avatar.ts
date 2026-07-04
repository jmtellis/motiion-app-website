import type { DashboardProfile } from "@/types/database";

import { isHiringAccount, isOnboardingComplete } from "@/lib/auth/profile";
import { BUYER_DASHBOARD_PATH } from "@/lib/talent-buyers/dashboard-data";

export function getProfileInitials(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function getProfileAvatarUrl(headshotUrls: string[] | null | undefined) {
  const url = headshotUrls?.find((item) => item.trim().length > 0)?.trim();
  return url || null;
}

export function getAccountProfileHref(profile: DashboardProfile) {
  if (!isOnboardingComplete(profile)) {
    return isHiringAccount(profile.accountType) ? "/talent-buyers/onboarding" : "/onboarding";
  }
  if (isHiringAccount(profile.accountType)) {
    return BUYER_DASHBOARD_PATH;
  }
  return "/portfolio";
}

export function getAccountSettingsHref(profile: DashboardProfile) {
  if (isHiringAccount(profile.accountType) && isOnboardingComplete(profile)) {
    return `${BUYER_DASHBOARD_PATH}/settings`;
  }
  return "/settings";
}
