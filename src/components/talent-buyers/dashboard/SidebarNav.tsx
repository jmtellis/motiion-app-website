"use client";

import type { ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronsUpDown,
  Folder,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  BadgeCheck,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { MotiionWordmark } from "@/components/brand/MotiionWordmark";
import { getProfileInitials } from "@/lib/auth/avatar";
import { openBillingPortal, startIndustryCheckout } from "@/lib/billing/actions";
import type { UserEntitlement } from "@/lib/billing/entitlement";
import {
  BUYER_HOME_PATH,
  buyerInboxNavItem,
  buyerMenuNavItems,
  buyerNotificationsNavItem,
  buyerSettingsNavItem,
} from "@/lib/talent-buyers/dashboard-data";
import { useBuyerInboxUnread } from "@/hooks/use-buyer-inbox-unread";
import { useBuyerNotifications } from "@/hooks/use-buyer-notifications";
import type { DashboardProfile } from "@/types/database";

import "./buyer-chrome.css";

const navIcons = {
  projects: Folder,
  talent: Search,
  messages: Mail,
  calendar: CalendarDays,
  events: CalendarDays,
  library: BookOpen,
  settings: Settings,
  notifications: Bell,
} as const;

function formatBadge(count: number) {
  if (count <= 0) return null;
  if (count > 99) return "99+";
  if (count > 9) return "9+";
  return String(count);
}

function isNavActive(pathname: string, href: string) {
  if (href === "/projects") {
    return pathname === "/projects" || pathname.startsWith("/projects/");
  }
  if (href === "/talent") {
    return pathname.startsWith("/talent");
  }
  if (href === "/messages") {
    return pathname === "/messages" || pathname.startsWith("/messages/");
  }
  if (href === "/notifications") {
    return pathname === "/notifications" || pathname.startsWith("/notifications/");
  }
  if (href === "/events") {
    return (
      pathname === "/events" ||
      pathname.startsWith("/events/") ||
      pathname === "/calendar" ||
      pathname.startsWith("/calendar/")
    );
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
      <p className={`buyer-sidebar__section-label ${collapsed ? "sr-only" : ""}`}>{label}</p>
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
          {statusLabel ? <span className="buyer-sidebar__link-status">{statusLabel}</span> : null}
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

function SidebarNotificationsLink({
  userId,
  collapsed,
  onNavigate,
}: {
  userId: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { unreadCount } = useBuyerNotifications(userId);
  const badge = formatBadge(unreadCount);

  return (
    <NavLink
      href={buyerNotificationsNavItem.href}
      label={buyerNotificationsNavItem.label}
      icon={navIcons.notifications}
      active={isNavActive(pathname, buyerNotificationsNavItem.href)}
      collapsed={collapsed}
      badge={badge}
      onNavigate={onNavigate}
    />
  );
}

function SidebarPlanCta({
  entitlement,
  collapsed,
}: {
  entitlement: UserEntitlement;
  collapsed: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isPro = entitlement.active && entitlement.tier === "pro";
  const isTrial = entitlement.status === "trialing";

  if (isPro && !isTrial) return null;

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
    return (
      <div className="buyer-sidebar__cta buyer-sidebar__cta--collapsed">
        <button
          type="button"
          className="buyer-sidebar__cta-icon"
          disabled={isPending}
          aria-label={isTrial ? "Manage billing" : "Upgrade to Industry Pro"}
          onClick={() => go(isTrial ? openBillingPortal : startIndustryCheckout)}
        >
          <BadgeCheck className="size-4" aria-hidden />
        </button>
        {error ? <p className="sr-only">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="buyer-sidebar__cta">
      <div className="buyer-sidebar__cta-copy-block">
        <p className="buyer-sidebar__cta-title">
          {isTrial ? "Current plan: Pro trial" : "Upgrade to Industry Pro"}
        </p>
        <p className="buyer-sidebar__cta-copy">
          {isTrial
            ? "Manage billing anytime from Settings."
            : "Get full access to casting, talent search, and outreach."}
        </p>
      </div>
      <button
        type="button"
        className="buyer-sidebar__cta-btn"
        disabled={isPending}
        onClick={() => go(isTrial ? openBillingPortal : startIndustryCheckout)}
      >
        <BadgeCheck className="size-3.5" aria-hidden />
        {isPending ? "Working…" : isTrial ? "Manage billing" : "Upgrade to Pro"}
      </button>
      {error ? <p className="text-xs text-amber-300">{error}</p> : null}
    </div>
  );
}

function SidebarContent({
  profile,
  entitlement,
  pathname,
  collapsed,
  contentFadeIn = false,
  onContentFadeInEnd,
  onNavigate,
  onToggleSidebar,
  onOpenProfile,
  sidebarExpanded,
  mobileOpen,
}: {
  profile: DashboardProfile;
  entitlement: UserEntitlement;
  pathname: string;
  collapsed: boolean;
  contentFadeIn?: boolean;
  onContentFadeInEnd?: () => void;
  onNavigate?: () => void;
  onToggleSidebar?: () => void;
  onOpenProfile?: () => void;
  sidebarExpanded?: boolean;
  mobileOpen?: boolean;
}) {
  const showExpanded = sidebarExpanded || mobileOpen;
  const isMobileDrawer = Boolean(mobileOpen);
  const { unreadCount: inboxUnread } = useBuyerInboxUnread();
  const inboxBadge = formatBadge(inboxUnread);
  const initials = getProfileInitials(profile.fullName);
  const orgName = profile.organizationName || profile.companyName;
  const profileMeta = [orgName, planLabel(entitlement)].filter(Boolean).join(" · ");

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
      <div className={`buyer-sidebar__header ${collapsed ? "buyer-sidebar__header--collapsed" : ""}`}>
        {collapsed ? null : (
          <Link href={BUYER_HOME_PATH} className="buyer-sidebar__brand" aria-label="Motiion home">
            <MotiionWordmark height={10} />
          </Link>
        )}
        {onToggleSidebar ? (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="buyer-sidebar__collapse"
            aria-label={
              isMobileDrawer ? "Close navigation menu" : showExpanded ? "Collapse sidebar" : "Expand sidebar"
            }
            aria-expanded={showExpanded}
          >
            {isMobileDrawer ? (
              <X className="size-4" aria-hidden />
            ) : showExpanded ? (
              <PanelLeftClose className="size-4" aria-hidden />
            ) : (
              <PanelLeftOpen className="size-4" aria-hidden />
            )}
          </button>
        ) : null}
      </div>

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
                onNavigate={onNavigate}
              />
            );
          })}
        </NavSection>

        <NavSection label="Account" collapsed={collapsed}>
          <NavLink
            href={buyerInboxNavItem.href}
            label={buyerInboxNavItem.label}
            icon={navIcons.messages}
            active={isNavActive(pathname, buyerInboxNavItem.href)}
            collapsed={collapsed}
            badge={inboxBadge}
            onNavigate={onNavigate}
          />
          <SidebarNotificationsLink
            userId={profile.id}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
          <NavLink
            href={buyerSettingsNavItem.href}
            label={buyerSettingsNavItem.label}
            icon={navIcons.settings}
            active={isNavActive(pathname, buyerSettingsNavItem.href)}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        </NavSection>
      </div>

      <div className="buyer-sidebar__footer">
        <SidebarPlanCta entitlement={entitlement} collapsed={collapsed} />

        <button
          type="button"
          className={`buyer-sidebar__profile ${collapsed ? "buyer-sidebar__profile--collapsed" : ""}`}
          onClick={onOpenProfile}
          aria-label="Your profile"
        >
          <span className="buyer-sidebar__avatar">
            {profile.avatarUrl ? (
              <Image src={profile.avatarUrl} alt="" fill className="object-cover" sizes="32px" unoptimized />
            ) : (
              initials || "?"
            )}
          </span>
          {collapsed ? (
            <span className="sr-only">{profile.fullName}</span>
          ) : (
            <>
              <span className="buyer-sidebar__profile-copy">
                <p className="buyer-sidebar__profile-name">{profile.fullName || "Your profile"}</p>
                <p className="buyer-sidebar__profile-meta">{profileMeta || planLabel(entitlement)}</p>
              </span>
              <ChevronsUpDown className="buyer-sidebar__profile-chevron" aria-hidden />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function SidebarNav({
  profile,
  entitlement,
  collapsed = false,
  mobileOpen = false,
  onMobileClose,
  onToggleSidebar,
  onOpenProfile,
  sidebarExpanded = true,
}: {
  profile: DashboardProfile;
  entitlement: UserEntitlement;
  collapsed?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onToggleSidebar?: () => void;
  onOpenProfile?: () => void;
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
          pathname={pathname}
          collapsed={railCollapsed}
          contentFadeIn={contentFadeIn}
          onContentFadeInEnd={() => setContentFadeIn(false)}
          onNavigate={onMobileClose}
          onToggleSidebar={onToggleSidebar}
          onOpenProfile={onOpenProfile}
          sidebarExpanded={sidebarExpanded}
          mobileOpen={showMobileDrawer}
        />
      </aside>
    </>
  );
}
