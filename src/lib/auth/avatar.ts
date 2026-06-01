import type { DashboardProfile } from "@/types/database";

import { isOnboardingComplete } from "@/lib/auth/profile";

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
    return "/onboarding";
  }
  return "/portfolio";
}
