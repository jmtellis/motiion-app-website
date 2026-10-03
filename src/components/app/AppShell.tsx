import { Suspense } from "react";

import { AppAnalytics } from "@/components/analytics/AppAnalytics";
import { AppTabNav } from "@/components/app/AppTabNav";
import { AccountPill } from "@/components/auth/AccountPill";
import { TalentWorkspace } from "@/components/workspace/TalentWorkspace";
import { WorkspaceFooterNotices } from "@/components/workspace/WorkspaceFooterNotices";
import { NavigationProgress } from "@/components/navigation/NavigationProgress";
import { fetchInboxBundle } from "@/lib/app/inbox";
import { inboxNavBadgeCount } from "@/lib/messaging/inbox-partition";
import { fetchPendingCastingInviteCount } from "@/lib/app/talent-castings";
import {
  getAccountProfileHref,
  getAccountSettingsHref,
  getProfileInitials,
} from "@/lib/auth/avatar";
import { getShellMenuAction, isCommunityAccount } from "@/lib/auth/profile";
import { hasCommunityProAccess, hasTalentProAccess } from "@/lib/billing/entitlement";
import { getAppEnvironment } from "@/lib/environment";
import type { DashboardProfile } from "@/types/database";

async function AppTabNavWithUnread({
  variant,
  placement,
}: {
  variant: "talent" | "community";
  placement: "top" | "bottom" | "sidebar";
}) {
  const [bundle, inviteCount] = await Promise.all([
    fetchInboxBundle(),
    variant === "talent" ? fetchPendingCastingInviteCount() : Promise.resolve(0),
  ]);
  const inboxUnread = inboxNavBadgeCount(
    bundle.conversations,
    bundle.messageRequests.length,
    bundle.pendingRequests.length,
  );
  return (
    <AppTabNav
      inboxUnread={inboxUnread}
      inviteCount={inviteCount}
      variant={variant}
      placement={placement}
    />
  );
}

export async function AppShell({
  profile,
  children,
}: {
  profile: DashboardProfile;
  children: React.ReactNode;
}) {
  const navVariant = isCommunityAccount(profile.accountType)
    ? "community"
    : "talent";
  const isPro =
    navVariant === "community"
      ? await hasCommunityProAccess(profile.id)
      : await hasTalentProAccess(profile.id);
  const upgradeDetail =
    navVariant === "community"
      ? "Unlock Pro community features."
      : "Unlimited submissions and more portfolio space.";

  return (
    <>
      <AppAnalytics />
      <TalentWorkspace
        userId={profile.id}
        community={navVariant === "community"}
        progress={<NavigationProgress />}
        navigation={
          <Suspense
            fallback={
              <AppTabNav
                inboxUnread={0}
                variant={navVariant}
                placement="sidebar"
              />
            }
          >
            <AppTabNavWithUnread variant={navVariant} placement="sidebar" />
          </Suspense>
        }
        account={
          <>
            <WorkspaceFooterNotices
              testEnvironment={getAppEnvironment() !== "production"}
              upgrade={
                isPro
                  ? null
                  : {
                      title: "Upgrade to Pro",
                      detail: upgradeDetail,
                      actionLabel: "Upgrade",
                      href: "/settings?section=resources",
                    }
              }
            />
            <AccountPill
            placement="sidebar"
            workspaceLabel={
              navVariant === "community"
                ? "Community workspace"
                : "Talent workspace"
            }
            shellAction={getShellMenuAction(profile)}
            user={{
              fullName: profile.fullName,
              initials: getProfileInitials(profile.fullName),
              avatarUrl: profile.avatarUrl ?? null,
              profileHref: getAccountProfileHref(profile),
              settingsHref: getAccountSettingsHref(profile),
            }}
          />
          </>
        }
      >
        {children}
      </TalentWorkspace>
    </>
  );
}
