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
  { id: "talent", label: "For Talent", href: "/for-talent" },
  { id: "clients", label: "For Clients", href: "/for-clients" },
  { id: "agents", label: "For Agents", href: "/for-agents" },
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
}: {
  activeTab?: MarketingHeaderTab;
  overlay?: boolean;
}) {
  const profile = await getCurrentUserProfile();
  const showAccountPill = profile && isOnboardingComplete(profile);
  const accountUser = showAccountPill && profile ? toAccountPillUser(profile) : null;

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-xl ${
        overlay
          ? "border-[var(--line)]/60 bg-[var(--paper)]/75"
          : "border-[var(--line)]/80 bg-[var(--paper)]/90"
      }`}
    >
      <div className="mx-auto flex min-h-[4.25rem] w-full max-w-6xl items-center justify-between gap-4 px-6 py-3 lg:px-10">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center transition-opacity hover:opacity-80"
          aria-label="Motiion home"
        >
          <MotiionBrandMark priority />
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
                className={`shrink-0 border-b-2 pb-0.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                  active
                    ? "border-[var(--accent-dark)] text-[var(--ink)]"
                    : "border-transparent text-[var(--ink-soft)] hover:border-[var(--line)] hover:text-[var(--ink)]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {accountUser ? (
            <AccountPill user={accountUser} />
          ) : (
            <Link href={JOIN_BETA_CTA.href} className="btn-primary text-sm">
              {JOIN_BETA_CTA.label}
            </Link>
          )}
        </div>
      </div>

      <nav
        aria-label="Primary mobile"
        className="flex gap-1 overflow-x-auto border-t border-[var(--line)]/60 px-4 py-2 md:hidden"
      >
        {marketingTabs.map((tab) => {
          const active = activeTab !== null && activeTab === tab.id;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-[var(--ink)] text-white"
                  : "text-[var(--ink-soft)] hover:bg-white/80"
              }`}
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
