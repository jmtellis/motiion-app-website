import { Suspense } from "react";

import { AppAnalytics } from "@/components/analytics/AppAnalytics";
import { AppTabNav } from "@/components/app/AppTabNav";
import { AccountPill } from "@/components/auth/AccountPill";
import { TalentWorkspace } from "@/components/workspace/TalentWorkspace";
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
  placement: "top" | "bottom" | "sidebar";
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
    <>
      <AppAnalytics />
      <TalentWorkspace
        community={navVariant === "community"}
        settingsHref={getAccountSettingsHref(profile)}
        progress={<NavigationProgress />}
        navigation={<Suspense fallback={<AppTabNav inboxUnread={0} variant={navVariant} placement="sidebar" />}><AppTabNavWithUnread variant={navVariant} placement="sidebar" /></Suspense>}
        mobileNavigation={<Suspense fallback={<AppTabNav inboxUnread={0} variant={navVariant} placement="bottom" />}><AppTabNavWithUnread variant={navVariant} placement="bottom" /></Suspense>}
        account={<><NotificationBell userId={profile.id} /><AccountPill user={{ fullName: profile.fullName, initials: getProfileInitials(profile.fullName), avatarUrl: profile.avatarUrl ?? null, profileHref: getAccountProfileHref(profile), settingsHref: getAccountSettingsHref(profile) }} /></>}
      >{children}</TalentWorkspace>
    </>
  );
}
