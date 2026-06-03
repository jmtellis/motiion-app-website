import Link from "next/link";

import { AccountPill, type AccountPillUser } from "@/components/auth/AccountPill";
import { MotiionBrandMark } from "@/components/brand/MotiionBrandMark";
import { getAccountProfileHref, getProfileInitials } from "@/lib/auth/avatar";
import { isOnboardingComplete } from "@/lib/auth/profile";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { JOIN_BETA_CTA } from "@/lib/marketing/marketing-pages";
import type { MarketingHeaderTab, MarketingTab } from "@/lib/marketing/marketing-pages";
import type { DashboardProfile } from "@/types/database";

const marketingTabs: { id: MarketingTab; label: string; href: string }[] = [
  { id: "talent", label: "Dancers", href: "/for-talent" },
  { id: "casting", label: "Choreographers & Casting", href: "/for-casting" },
  { id: "demo", label: "Request a Demo", href: "/request-demo" },
];

function toAccountPillUser(profile: DashboardProfile): AccountPillUser {
  return {
    fullName: profile.fullName,
    initials: getProfileInitials(profile.fullName),
    avatarUrl: profile.avatarUrl ?? null,
    profileHref: getAccountProfileHref(profile),
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
      ? "max-md:bg-transparent max-md:backdrop-blur-none md:border-white/10 md:bg-black/75 md:backdrop-blur-xl"
      : "border-white/10 bg-black/92 backdrop-blur-xl md:border-white/10"
    : overlay
      ? "max-md:bg-transparent max-md:backdrop-blur-none md:border-[var(--line)]/60 md:bg-[var(--paper)]/75 md:backdrop-blur-xl"
      : "bg-[var(--paper)]/90 backdrop-blur-xl md:border-[var(--line)]/80";

  const tabClass = (active: boolean) =>
    darkTheme
      ? active
        ? "border-[var(--accent)] text-on-dark-primary"
        : "border-transparent text-white/60 hover:border-white/25 hover:text-white"
      : active
        ? "border-[var(--accent-dark)] text-[var(--ink)]"
        : "border-transparent text-[var(--ink-soft)] hover:border-[var(--line)] hover:text-[var(--ink)]";

  const mobileTabClass = (active: boolean) =>
    darkTheme
      ? active
        ? "bg-white text-black"
        : "text-white/60 hover:bg-white/10"
      : active
        ? "bg-[var(--ink)] text-white"
        : "text-[var(--ink-soft)] hover:bg-white/80";

  return (
    <header
      className={`sticky top-0 z-50 border-b max-md:border-b-0 ${headerSurfaceClass}`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-center gap-4 px-6 pt-3 pb-0 md:min-h-[4.25rem] md:justify-between md:py-3 lg:px-10">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center transition-opacity hover:opacity-80"
          aria-label="Motiion home"
        >
          <MotiionBrandMark priority inverted={darkTheme} />
        </Link>

        <nav
          aria-label="Primary"
          className="hidden min-w-0 flex-1 items-center justify-center gap-6 md:flex lg:gap-8"
        >
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

        <div className="hidden shrink-0 items-center gap-2 sm:gap-3 md:flex">
          {accountUser ? (
            <AccountPill user={accountUser} />
          ) : (
            <Link
              href={JOIN_BETA_CTA.href}
              className={`btn-primary text-sm${darkTheme ? " btn-on-dark" : ""}`}
            >
              {JOIN_BETA_CTA.label}
            </Link>
          )}
        </div>
      </div>

      <nav aria-label="Primary mobile" className="flex w-full px-4 pt-4 pb-3 md:hidden">
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
    </header>
  );
}
