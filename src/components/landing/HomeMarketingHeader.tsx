import { getAccountProfileHref, getProfileInitials } from "@/lib/auth/avatar";
import { isOnboardingComplete } from "@/lib/auth/profile";
import { getCurrentUserProfile } from "@/lib/auth/session";
import type { DashboardProfile } from "@/types/database";
import type { AccountPillUser } from "@/components/auth/AccountPill";

import { HomeMarketingHeaderClient } from "./HomeMarketingHeaderClient";

function toAccountPillUser(profile: DashboardProfile): AccountPillUser {
  return {
    fullName: profile.fullName,
    initials: getProfileInitials(profile.fullName),
    avatarUrl: profile.avatarUrl ?? null,
    profileHref: getAccountProfileHref(profile),
  };
}

/** Root landing: hero = centered logo; past hero = tabs + sign up only. */
export async function HomeMarketingHeader({ darkTheme = false }: { darkTheme?: boolean }) {
  const profile = await getCurrentUserProfile();
  const showAccountPill = profile && isOnboardingComplete(profile);
  const accountUser = showAccountPill && profile ? toAccountPillUser(profile) : null;

  return <HomeMarketingHeaderClient accountUser={accountUser} darkTheme={darkTheme} />;
}
