import Link from "next/link";

import { AppAnalytics } from "@/components/analytics/AppAnalytics";
import { AppTabNav } from "@/components/app/AppTabNav";
import { AccountPill } from "@/components/auth/AccountPill";
import { MotiionBrandMark } from "@/components/brand/MotiionBrandMark";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { fetchInboxConversations } from "@/lib/app/inbox";
import { getAccountProfileHref, getAccountSettingsHref, getProfileInitials } from "@/lib/auth/avatar";
import type { DashboardProfile } from "@/types/database";

export async function AppShell({
  profile,
  children,
}: {
  profile: DashboardProfile;
  children: React.ReactNode;
}) {
  const { conversations } = await fetchInboxConversations();
  const inboxUnread = conversations.reduce((sum, row) => sum + Number(row.unread_count ?? 0), 0);

  return (
    <div className="theme-dark min-h-screen bg-[#0a0a0a] text-[#fafafa] motion-safe:transition-colors">
      <AppAnalytics />
      <header className="sticky top-0 z-50 border-b border-[#262626] bg-[#0a0a0a]/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-5 px-6 py-2.5 lg:px-8">
          <Link
            href="/home"
            aria-label="Motiion home"
            className="inline-flex shrink-0 items-center transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <MotiionBrandMark inverted height={18} />
          </Link>
          <span className="hidden h-5 w-px shrink-0 bg-[#262626] sm:block" aria-hidden />
          <AppTabNav inboxUnread={inboxUnread} />
          <div className="flex shrink-0 items-center gap-2">
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
        className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8 lg:py-8 focus:outline-none"
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
