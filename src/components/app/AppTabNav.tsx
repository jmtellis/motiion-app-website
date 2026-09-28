"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  House,
  Layers,
  Inbox,
  Megaphone,
  Settings,
  Search,
} from "lucide-react";

import { trackClientEvent } from "@/lib/analytics/track-client";

/** Canonical talent IA: Home · Inbox · Discover · Schedule · Portfolio. */
const talentTabs = [
  { href: "/home", label: "Home", icon: House },
  { href: "/opportunities", label: "Opportunities", icon: Megaphone },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/discover", label: "Discover", icon: Search },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/portfolio", label: "Portfolio", icon: Layers },
] as const;

/** Community: Home · Browse · Inbox · Settings */
const communityTabs = [
  { href: "/home", label: "Home", icon: House },
  { href: "/discover", label: "Browse", icon: Search },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

/** Inline nav tabs for the single-row app bar (desktop) or bottom bar (mobile). */
export function AppTabNav({
  inboxUnread = 0,
  inviteCount = 0,
  variant = "talent",
  placement = "top",
}: {
  inboxUnread?: number;
  inviteCount?: number;
  variant?: "talent" | "community";
  placement?: "top" | "bottom" | "sidebar";
}) {
  const pathname = usePathname();
  const tabs = (variant === "community" ? communityTabs : talentTabs).filter(tab => placement !== "sidebar" || tab.href !== "/settings");
  const isBottom = placement === "bottom";
  const isSidebar = placement === "sidebar";

  return (
    <div
      className={
        isSidebar ? "workspace-nav" : isBottom
          ? "flex w-full items-stretch justify-around gap-0.5 px-1 pt-1"
          : "flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
      }
      role={isBottom ? undefined : "navigation"}
      aria-label={isBottom ? undefined : "App"}
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const badgeCount = tab.href === "/inbox" ? inboxUnread : tab.href === "/opportunities" ? inviteCount : 0;
        const showBadge = badgeCount > 0;
        const Icon = tab.icon;

        if (isSidebar) {
          return <Link key={tab.href} href={tab.href} title={tab.label}
            className="workspace-nav-link" aria-current={active ? "page" : undefined}
            onClick={() => trackClientEvent("app_tab_viewed", { tab: tab.label.toLowerCase() }, tab.href)}>
            <Icon aria-hidden="true" /><span className="workspace-nav-label">{tab.label}</span>
            {showBadge ? <span className="workspace-nav-badge">{badgeCount > 99 ? "99+" : badgeCount}</span> : null}
          </Link>;
        }

        if (isBottom) {
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => {
                trackClientEvent("app_tab_viewed", { tab: tab.label.toLowerCase() }, tab.href);
              }}
              className={`relative flex min-h-[var(--ds-control-height)] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[var(--ds-radius-md)] px-1 py-1 text-[10px] font-medium transition-colors ${
                active
                  ? "text-[var(--ds-text-default)]"
                  : "text-[var(--ds-muted)] hover:text-[var(--ds-on-surface)]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
              <span className="truncate">{tab.label}</span>
              {showBadge ? (
                <span className="absolute top-1 right-[calc(50%-18px)] inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-[var(--ds-accent)] px-1 py-0.5 font-mono text-[9px] font-bold text-[var(--ds-on-accent)]">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              ) : null}
            </Link>
          );
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={() => {
              trackClientEvent("app_tab_viewed", { tab: tab.label.toLowerCase() }, tab.href);
            }}
            className={`relative shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-[var(--ds-surface-raised)] text-[var(--ds-text-default)]"
                : "text-[var(--ds-muted)] hover:bg-[var(--ds-surface)] hover:text-[var(--ds-on-surface)]"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
            {showBadge ? (
              <span className="ml-1.5 inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-[var(--ds-accent)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[var(--ds-on-accent)]">
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
