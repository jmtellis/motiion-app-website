import Link from "next/link";
import { Suspense } from "react";

import { AppAnalytics } from "@/components/analytics/AppAnalytics";
import { AppTabNav } from "@/components/app/AppTabNav";
import { AccountPill } from "@/components/auth/AccountPill";
import { MotiionBrandMark } from "@/components/brand/MotiionBrandMark";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { NavigationProgress } from "@/components/navigation/NavigationProgress";
import { fetchInboxConversations } from "@/lib/app/inbox";
import { getAccountProfileHref, getAccountSettingsHref, getProfileInitials } from "@/lib/auth/avatar";
import { isCommunityAccount } from "@/lib/auth/profile";
import type { DashboardProfile } from "@/types/database";

async function AppTabNavWithUnread({
  variant,
  placement,
}: {
  variant: "talent" | "community";
  placement: "top" | "bottom";
}) {
  const { conversations } = await fetchInboxConversations();
  const inboxUnread = conversations.reduce((sum, row) => sum + Number(row.unread_count ?? 0), 0);
  return <AppTabNav inboxUnread={inboxUnread} variant={variant} placement={placement} />;
}

export function AppShell({
  profile,
  children,
}: {
  profile: DashboardProfile;
  children: React.ReactNode;
}) {
  const navVariant = isCommunityAccount(profile.accountType) ? "community" : "talent";

  return (
    <div className="theme-dark theme-product min-h-screen bg-[var(--ds-background)] text-[var(--ds-text-default)] motion-safe:transition-colors">
      <AppAnalytics />
      <header className="sticky top-0 z-50 border-b border-[var(--ds-border)] bg-[color-mix(in_oklab,var(--ds-background)_95%,transparent)] backdrop-blur-md">
        <div className="relative mx-auto flex w-full max-w-7xl items-center gap-5 px-6 py-2.5 lg:px-8">
          <NavigationProgress />
          <Link
            href="/home"
            aria-label="Motiion home"
            className="inline-flex shrink-0 items-center transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-accent)]"
          >
            <MotiionBrandMark inverted height={18} />
          </Link>
          <span className="hidden h-5 w-px shrink-0 bg-[var(--ds-border)] sm:block" aria-hidden />
          <div className="hidden min-w-0 flex-1 md:block">
            <Suspense fallback={<AppTabNav inboxUnread={0} variant={navVariant} placement="top" />}>
              <AppTabNavWithUnread variant={navVariant} placement="top" />
            </Suspense>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <NotificationBell userId={profile.id} />
            <AccountPill
              user={{
                fullName: profile.fullName,
                initials: getProfileInitials(profile.fullName),
                avatarUrl: profile.avatarUrl ?? null,
                profileHref: getAccountProfileHref(profile),
                settingsHref: getAccountSettingsHref(profile),
              }}
            />
          </div>
        </div>
      </header>
      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl px-6 py-6 pb-24 md:pb-8 lg:px-8 lg:py-8 focus:outline-none"
        tabIndex={-1}
      >
        {children}
      </main>
      <nav
        aria-label="App"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--ds-border)] bg-[color-mix(in_oklab,var(--ds-background)_96%,transparent)] backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <Suspense fallback={<AppTabNav inboxUnread={0} variant={navVariant} placement="bottom" />}>
          <AppTabNavWithUnread variant={navVariant} placement="bottom" />
        </Suspense>
      </nav>
    </div>
  );
}
