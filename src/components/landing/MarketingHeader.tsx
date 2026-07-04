import Link from "next/link";

import { AccountPill, type AccountPillUser } from "@/components/auth/AccountPill";
import { MotiionBrandMark } from "@/components/brand/MotiionBrandMark";
import { getAccountProfileHref, getAccountSettingsHref, getProfileInitials } from "@/lib/auth/avatar";
import { isOnboardingComplete } from "@/lib/auth/profile";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { INDUSTRY_PRO_SIGNUP_CTA, JOIN_BETA_CTA } from "@/lib/marketing/marketing-pages";
import type { MarketingHeaderTab, MarketingTab } from "@/lib/marketing/marketing-pages";
import type { DashboardProfile } from "@/types/database";

const marketingTabs: { id: MarketingTab; label: string; href: string }[] = [
  { id: "talent", label: "Talent", href: "/for-talent" },
  { id: "casting", label: "Industry Professionals", href: "/for-casting" },
];

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

  const tabClass = (active: boolean) =>
    darkTheme
      ? active
        ? "border-transparent rounded-[8px] bg-[#151515] px-3 py-1.5 text-[#fafafa]"
        : "border-transparent rounded-[8px] px-3 py-1.5 text-[#8a8a8a] hover:bg-[#151515] hover:text-[#eaeaea]"
      : active
        ? "border-[var(--accent-dark)] text-[var(--ink)]"
        : "border-transparent text-[var(--ink-soft)] hover:border-[var(--line)] hover:text-[var(--ink)]";

  const mobileTabClass = (active: boolean) =>
    darkTheme
      ? active
        ? "bg-[#fafafa] text-[#0a0a0a]"
        : "text-[#8a8a8a] hover:bg-[#151515]"
      : active
        ? "bg-[var(--ink)] text-white"
        : "text-[var(--ink-soft)] hover:bg-white/80";

  const logoLink = (
    <Link
      href="/"
      className="inline-flex shrink-0 items-center transition-opacity hover:opacity-80 md:absolute md:top-1/2 md:left-1/2 md:z-10 md:-translate-x-1/2 md:-translate-y-1/2"
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
      <div className="mx-auto flex w-full max-w-6xl flex-col md:hidden">
        <div className="flex justify-center px-6 pt-3 pb-0">{logoLink}</div>
        <nav aria-label="Primary mobile" className="flex w-full px-4 pt-4 pb-3">
          {marketingTabs.map((tab) => {
            const active = activeTab !== null && activeTab === tab.id;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex min-w-0 flex-1 items-center justify-center rounded-full px-2 py-1.5 text-center text-xs font-semibold transition ${mobileTabClass(active)}`}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="relative mx-auto hidden min-h-[4.25rem] w-full max-w-6xl items-center gap-3 px-6 py-3 md:flex lg:gap-4 lg:px-10">
        <nav aria-label="Primary" className="flex min-w-0 flex-1 items-center gap-6 lg:gap-8">
          {marketingTabs.map((tab) => {
            const active = activeTab !== null && activeTab === tab.id;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`shrink-0 border-b-2 pb-0.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${tabClass(active)}`}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {logoLink}

        <div className="relative z-10 flex flex-1 items-center justify-end gap-2 sm:gap-3">
          {actions}
        </div>
      </div>
    </header>
  );
}
