import Link from "next/link";

import { AccountPill, type AccountPillUser } from "@/components/auth/AccountPill";
import { MotiionBrandMark } from "@/components/brand/MotiionBrandMark";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { getAccountProfileHref, getAccountSettingsHref, getProfileInitials } from "@/lib/auth/avatar";
import type { DashboardProfile } from "@/types/database";

type NavLink = { label: string; href: string };

function toAccountPillUser(profile: DashboardProfile): AccountPillUser {
  return {
    fullName: profile.fullName,
    initials: getProfileInitials(profile.fullName),
    avatarUrl: profile.avatarUrl ?? null,
    profileHref: getAccountProfileHref(profile),
    settingsHref: getAccountSettingsHref(profile),
  };
}

function HeaderLogo({ homeHref }: { homeHref: string }) {
  const className =
    "inline-flex items-center transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

  if (homeHref.startsWith("#")) {
    return (
      <a href={homeHref} className={className} aria-label="Motiion home">
        <MotiionBrandMark />
      </a>
    );
  }

  return (
    <Link href={homeHref} className={className} aria-label="Motiion home">
      <MotiionBrandMark />
    </Link>
  );
}

export function AppHeader({
  profile,
  navLinks,
  homeHref = "/",
  centeredLogo = false,
  hideAccountMenu = false,
}: {
  profile: DashboardProfile | null;
  navLinks?: NavLink[];
  homeHref?: string;
  /** Login / sign-up — logo centered like the home marketing header. */
  centeredLogo?: boolean;
  /** Hide account menu during sign-up or onboarding. */
  hideAccountMenu?: boolean;
}) {
  const accountUser = profile && !hideAccountMenu ? toAccountPillUser(profile) : null;

  if (centeredLogo) {
    return (
      <header className="sticky top-0 z-50 border-b border-[var(--line)]/80 bg-[var(--paper)]/95">
        <div className="relative mx-auto flex min-h-[4.25rem] w-full max-w-6xl items-center px-6 py-3 lg:px-10">
          <div className="flex-1" aria-hidden />
          <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <HeaderLogo homeHref={homeHref} />
          </div>
          <div className="relative z-10 flex flex-1 items-center justify-end">
            {accountUser ? <AccountPill user={accountUser} /> : null}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)]/80 bg-[var(--paper)]/95">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 lg:px-10">
        <HeaderLogo homeHref={homeHref} />

        {navLinks?.length ? (
          <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) =>
              link.href.startsWith("#") ? (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        ) : null}

        <div className="flex items-center gap-2 sm:gap-3">
          {accountUser && profile ? (
            <>
              <NotificationBell userId={profile.id} />
              <AccountPill user={accountUser} />
            </>
          ) : (
            <Link href="/#signup" className="btn-primary text-sm">
              Join Beta
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

