import Link from "next/link";

import { AccountPill, type AccountPillUser } from "@/components/auth/AccountPill";
import { MotiionBrandMark } from "@/components/brand/MotiionBrandMark";
import { getAccountProfileHref, getAccountSettingsHref, getProfileInitials } from "@/lib/auth/avatar";
import { isOnboardingComplete } from "@/lib/auth/profile";
import { getCurrentUserProfile } from "@/lib/auth/session";
import {
  INDUSTRY_PRO_SIGNUP_CTA,
  JOIN_BETA_CTA,
} from "@/lib/marketing/marketing-pages";
import type { MarketingHeaderTab } from "@/lib/marketing/marketing-pages";
import type { DashboardProfile } from "@/types/database";

function toAccountPillUser(profile: DashboardProfile): AccountPillUser {
  return {
    fullName: profile.fullName,
    initials: getProfileInitials(profile.fullName),
    avatarUrl: profile.avatarUrl ?? null,
    profileHref: getAccountProfileHref(profile),
    settingsHref: getAccountSettingsHref(profile),
  };
}

export async function MarketingHeader({
  activeTab = null,
  overlay = false,
  darkTheme = false,
}: {
  activeTab?: MarketingHeaderTab;
  overlay?: boolean;
  darkTheme?: boolean;
}) {
  const profile = await getCurrentUserProfile();
  const showAccountPill = profile && isOnboardingComplete(profile);
  const accountUser = showAccountPill && profile ? toAccountPillUser(profile) : null;

  const headerSurfaceClass = darkTheme
    ? overlay
      ? "max-md:bg-transparent md:border-[#262626] md:bg-[var(--stage-black)]/95"
      : "border-[#262626] bg-[var(--stage-black)]"
    : overlay
      ? "max-md:bg-transparent md:border-[var(--line)]/80 md:bg-[var(--paper)]/95"
      : "border-[var(--line)]/80 bg-[var(--paper)]";

  const logoLink = (
    <Link
      href="/"
      className="inline-flex shrink-0 items-center transition-opacity hover:opacity-80"
      aria-label="Motiion home"
    >
      <MotiionBrandMark priority inverted={darkTheme} />
    </Link>
  );

  const headerCta = activeTab === "casting" ? INDUSTRY_PRO_SIGNUP_CTA : JOIN_BETA_CTA;

  const actions = accountUser ? (
    <AccountPill user={accountUser} />
  ) : (
    <Link
      href={headerCta.href}
      className={`btn-primary text-sm${darkTheme ? " btn-on-dark" : ""}`}
    >
      {headerCta.label}
    </Link>
  );

  return (
    <header
      className={`sticky top-0 z-50 border-b max-md:border-b-0 ${headerSurfaceClass}`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3 lg:px-10">
        {logoLink}
        <div className="relative z-10 flex items-center justify-end gap-2 sm:gap-3">
          {actions}
        </div>
      </div>
    </header>
  );
}
