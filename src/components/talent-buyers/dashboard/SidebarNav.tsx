"use client";

import type { ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  CalendarCheck,
  ChevronsUpDown,
  Folder,
  House,
  Inbox,
  Search,
  BadgeCheck,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { WorkspaceAccountMenu } from "@/components/workspace/WorkspaceAccountMenu";
import { WorkspaceFooterNotices } from "@/components/workspace/WorkspaceFooterNotices";
import { WorkspaceSidebarHeader } from "@/components/workspace/WorkspaceSidebarHeader";
import { getAccountSettingsHref, getProfileInitials } from "@/lib/auth/avatar";
import { getShellMenuAction } from "@/lib/auth/profile";
import {
  startIndustryCheckout,
} from "@/lib/billing/actions";
import type { UserEntitlement } from "@/lib/billing/entitlement";
import {
  BUYER_HOME_PATH,
  buyerMenuNavItems,
} from "@/lib/talent-buyers/dashboard-data";
import { useBuyerInboxUnread } from "@/hooks/use-buyer-inbox-unread";
import { openBuyerCommandPalette } from "@/lib/talent-buyers/command-palette";
import type { DashboardProfile } from "@/types/database";

import "./buyer-chrome.css";

const navIcons = {
  home: House,
  projects: Folder,
  bookings: CalendarCheck,
  talent: Search,
  messages: Inbox,
  calendar: CalendarDays,
  events: CalendarDays,
  library: BookOpen,
} as const;

function formatBadge(count: number) {
  if (count <= 0) return null;
  if (count > 99) return "99+";
  if (count > 9) return "9+";
  return String(count);
}

function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/projects") {
    return (
      pathname === "/projects" ||
      pathname.startsWith("/projects/") ||
      pathname.startsWith("/calendar/") ||
      pathname.startsWith("/jobs/")
    );
  }
  if (href === "/talent") {
    return pathname.startsWith("/talent");
  }
  if (href === "/messages") {
    return pathname === "/messages" || pathname.startsWith("/messages/");
  }
  if (href === "/notifications") {
    return (
      pathname === "/notifications" || pathname.startsWith("/notifications/")
    );
  }
  if (href === "/events") {
    return pathname === "/events" || pathname === "/calendar";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function planLabel(entitlement: UserEntitlement) {
  if (entitlement.status === "trialing") return "Pro trial";
  if (entitlement.active && entitlement.tier === "pro") return "Industry Pro";
  return "Free plan";
}

function NavSection({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="buyer-sidebar__section">
      <p
        className={`buyer-sidebar__section-label ${collapsed ? "sr-only" : ""}`}
      >
        {label}
      </p>
      <div className="buyer-sidebar__section-links">{children}</div>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  badge,
  statusLabel,
  disabled,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
  badge?: string | null;
  statusLabel?: string | null;
  disabled?: boolean;
  onNavigate?: () => void;
}) {
  const title = statusLabel ? `${label} · ${statusLabel}` : label;
  const className = `buyer-sidebar__link ${active ? "buyer-sidebar__link--active" : ""} ${
    collapsed ? "buyer-sidebar__link--collapsed" : ""
  } ${disabled ? "buyer-sidebar__link--disabled" : ""}`;

  const content = (
    <>
      <Icon className="buyer-sidebar__link-icon" aria-hidden />
      {collapsed ? (
        <>
          <span className="sr-only">{label}</span>
          {badge ? <span className="buyer-sidebar__badge">{badge}</span> : null}
        </>
      ) : (
        <>
          <span className="buyer-sidebar__link-label">{label}</span>
          {statusLabel ? (
            <span className="buyer-sidebar__link-status">{statusLabel}</span>
          ) : null}
          {badge ? <span className="buyer-sidebar__badge">{badge}</span> : null}
        </>
      )}
    </>
  );

  if (disabled) {
    return (
      <span className={className} aria-disabled="true" title={title}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? title : statusLabel ? title : undefined}
      className={className}
      aria-current={active ? "page" : undefined}
    >
      {content}
    </Link>
  );
}

function SidebarPlanCta({
  entitlement,
  collapsed,
  testEnvironment,
}: {
  entitlement: UserEntitlement;
  collapsed: boolean;
  testEnvironment: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isPro = entitlement.active && entitlement.tier === "pro";

  function go(action: () => Promise<{ url: string | null; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setError(result.error ?? "Something went wrong. Try again.");
    });
  }

  if (collapsed) {
    if (isPro) return null;
    return (
      <div className="buyer-sidebar__cta buyer-sidebar__cta--collapsed">
        <button
          type="button"
          className="buyer-sidebar__cta-icon"
          disabled={isPending}
          aria-label="Upgrade to Pro"
          onClick={() => go(startIndustryCheckout)}
        >
          <BadgeCheck className="size-4" aria-hidden />
        </button>
        {error ? <p className="sr-only">{error}</p> : null}
      </div>
    );
  }

  if (isPro && !testEnvironment) return null;

  return (
    <>
      <WorkspaceFooterNotices
        testEnvironment={testEnvironment}
        upgrade={
          isPro
            ? null
            : {
                title: "Upgrade to Pro",
                detail: "Get full access to casting, talent search, and outreach.",
                actionLabel: "Upgrade",
                pending: isPending,
                onAction: () => go(startIndustryCheckout),
              }
        }
      />
      {error ? <p className="px-3 text-xs text-amber-700">{error}</p> : null}
    </>
  );
}

function SidebarContent({
  profile,
  entitlement,
  pathname,
  collapsed,
  testEnvironment,
  contentFadeIn = false,
  onContentFadeInEnd,
  onNavigate,
  onToggleSidebar,
  sidebarExpanded,
  mobileOpen,
}: {
  profile: DashboardProfile;
  entitlement: UserEntitlement;
  pathname: string;
  collapsed: boolean;
  testEnvironment: boolean;
  contentFadeIn?: boolean;
  onContentFadeInEnd?: () => void;
  onNavigate?: () => void;
  onToggleSidebar?: () => void;
  sidebarExpanded?: boolean;
  mobileOpen?: boolean;
}) {
  const showExpanded = sidebarExpanded || mobileOpen;
  const isMobileDrawer = Boolean(mobileOpen);
  const { unreadCount: inboxUnread } = useBuyerInboxUnread();
  const inboxBadge = formatBadge(inboxUnread);
  const initials = getProfileInitials(profile.fullName);
  const orgName = profile.organizationName || profile.companyName;
  const profileMeta = [orgName, planLabel(entitlement)]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={[
        "buyer-sidebar__body",
        collapsed ? "" : "buyer-sidebar__body--expanded",
        contentFadeIn ? "buyer-sidebar__body--fade-in" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget) onContentFadeInEnd?.();
      }}
    >
      <WorkspaceSidebarHeader href={BUYER_HOME_PATH} collapsed={collapsed} expanded={Boolean(showExpanded)} mobile={isMobileDrawer} onToggle={onToggleSidebar} />

      <button
        type="button"
        className={`industry-sidebar-search${collapsed ? " industry-sidebar-search--collapsed" : ""}`}
        title="Quick navigation (⌘K / Ctrl K)"
        aria-label="Quick navigation"
        onClick={openBuyerCommandPalette}
      >
        <Search size={16} aria-hidden />
        {!collapsed && (
          <>
            <span>Jump to…</span>
            <kbd>⌘ K</kbd>
          </>
        )}
      </button>
      <div className="buyer-sidebar__scroll buyer-dashboard-shell__sidebar-scroll">
        <NavSection label="Workflow" collapsed={collapsed}>
          {buyerMenuNavItems.map((item) => {
            const Icon = navIcons[item.segment as keyof typeof navIcons];
            return (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={Icon}
                active={isNavActive(pathname, item.href)}
                collapsed={collapsed}
                badge={item.segment === "messages" ? inboxBadge : null}
                onNavigate={onNavigate}
              />
            );
          })}
        </NavSection>
      </div>

      <div className="buyer-sidebar__footer">
        <SidebarPlanCta
          entitlement={entitlement}
          collapsed={collapsed}
          testEnvironment={testEnvironment}
        />

        <WorkspaceAccountMenu
          className="workspace-account-menu"
          buttonClassName={`buyer-sidebar__profile ${collapsed ? "buyer-sidebar__profile--collapsed" : ""}`}
          label={`Account menu for ${profile.fullName || "your profile"}`}
          settingsHref={getAccountSettingsHref(profile)}
          shellAction={getShellMenuAction(profile)}
        >
          <span className="buyer-sidebar__avatar">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt=""
                fill
                className="object-cover"
                sizes="32px"
                unoptimized
              />
            ) : (
              initials || "?"
            )}
          </span>
          {collapsed ? (
            <span className="sr-only">{profile.fullName}</span>
          ) : (
            <>
              <span className="buyer-sidebar__profile-copy">
                <p className="buyer-sidebar__profile-name">
                  {profile.fullName || "Your profile"}
                </p>
                <p className="buyer-sidebar__profile-meta">
                  {profileMeta || planLabel(entitlement)}
                </p>
              </span>
              <ChevronsUpDown
                className="buyer-sidebar__profile-chevron"
                aria-hidden
              />
            </>
          )}
        </WorkspaceAccountMenu>
      </div>
    </div>
  );
}

export function SidebarNav({
  profile,
  entitlement,
  testEnvironment = false,
  collapsed = false,
  mobileOpen = false,
  onMobileClose,
  onToggleSidebar,
  sidebarExpanded = true,
}: {
  profile: DashboardProfile;
  entitlement: UserEntitlement;
  testEnvironment?: boolean;
  collapsed?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onToggleSidebar?: () => void;
  sidebarExpanded?: boolean;
}) {
  const pathname = usePathname();
  const showMobileDrawer = mobileOpen;
  const railCollapsed = collapsed && !showMobileDrawer;
  const [contentFadeIn, setContentFadeIn] = useState(false);
  const skipNextExpandReveal = useRef(true);

  useEffect(() => {
    if (showMobileDrawer) {
      setContentFadeIn(false);
      skipNextExpandReveal.current = false;
      return;
    }

    if (collapsed) {
      setContentFadeIn(false);
      skipNextExpandReveal.current = false;
      return;
    }

    if (skipNextExpandReveal.current) {
      skipNextExpandReveal.current = false;
      setContentFadeIn(false);
      return;
    }

    setContentFadeIn(true);
  }, [collapsed, showMobileDrawer]);

  return (
    <>
      {showMobileDrawer ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Close navigation overlay"
          onClick={onMobileClose}
        />
      ) : null}

      <aside
        id="buyer-sidebar-nav"
        className={`buyer-sidebar z-50 shrink-0 transition-[width,transform] duration-200 ease-out lg:translate-x-0 ${
          railCollapsed ? "buyer-sidebar--collapsed" : ""
        } max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:flex max-lg:h-dvh max-lg:flex-col max-lg:w-[min(100%,17.5rem)] ${
          showMobileDrawer
            ? "max-lg:pointer-events-auto max-lg:translate-x-0"
            : "max-lg:pointer-events-none max-lg:-translate-x-full"
        }`}
      >
        <SidebarContent
          profile={profile}
          entitlement={entitlement}
          testEnvironment={testEnvironment}
          pathname={pathname}
          collapsed={railCollapsed}
          contentFadeIn={contentFadeIn}
          onContentFadeInEnd={() => setContentFadeIn(false)}
          onNavigate={onMobileClose}
          onToggleSidebar={onToggleSidebar}
          sidebarExpanded={sidebarExpanded}
          mobileOpen={showMobileDrawer}
        />
      </aside>
    </>
  );
}
