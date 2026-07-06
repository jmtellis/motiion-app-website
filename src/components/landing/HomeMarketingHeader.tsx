import { getAccountProfileHref, getAccountSettingsHref, getProfileInitials } from "@/lib/auth/avatar";
import { isOnboardingComplete } from "@/lib/auth/profile";
import { getCurrentUserProfile } from "@/lib/auth/session";
import type { MarketingHeaderTab } from "@/lib/marketing/marketing-pages";
import type { DashboardProfile } from "@/types/database";
import type { AccountPillUser } from "@/components/auth/AccountPill";

import { HomeMarketingHeaderClient } from "./HomeMarketingHeaderClient";

function toAccountPillUser(profile: DashboardProfile): AccountPillUser {
  return {
    fullName: profile.fullName,
    initials: getProfileInitials(profile.fullName),
    avatarUrl: profile.avatarUrl ?? null,
    profileHref: getAccountProfileHref(profile),
    settingsHref: getAccountSettingsHref(profile),
  };
}

/** Marketing landing header: resting emblem, scrolled wordmark + tabs + CTA. */
export async function HomeMarketingHeader({
  activeTab = null,
  darkTheme = false,
  wordmarkHeader = false,
}: {
  activeTab?: MarketingHeaderTab;
  darkTheme?: boolean;
  wordmarkHeader?: boolean;
}) {
  const profile = await getCurrentUserProfile();
  const showAccountPill = profile && isOnboardingComplete(profile);
  const accountUser = showAccountPill && profile ? toAccountPillUser(profile) : null;

  return (
    <HomeMarketingHeaderClient
      accountUser={accountUser}
      activeTab={activeTab}
      darkTheme={darkTheme}
      wordmarkHeader={wordmarkHeader}
    />
  );
}
