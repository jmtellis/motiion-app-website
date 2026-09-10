"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Compass,
  House,
  Layers,
  MessageSquare,
  Settings,
  Search,
} from "lucide-react";

import { trackClientEvent } from "@/lib/analytics/track-client";

/** Canonical talent IA: Home · Chat · Navigator · Schedule · Portfolio (iOS AppRootView). */
const talentTabs = [
  { href: "/home", label: "Home", icon: House },
  { href: "/inbox", label: "Chat", icon: MessageSquare },
  { href: "/discover", label: "Navigator", icon: Compass },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/portfolio", label: "Portfolio", icon: Layers },
] as const;

/** Community: Home · Browse · Chat · Settings */
const communityTabs = [
  { href: "/home", label: "Home", icon: House },
  { href: "/discover", label: "Browse", icon: Search },
  { href: "/inbox", label: "Chat", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

/** Inline nav tabs for the single-row app bar (desktop) or bottom bar (mobile). */
export function AppTabNav({
  inboxUnread = 0,
  variant = "talent",
  placement = "top",
}: {
  inboxUnread?: number;
  variant?: "talent" | "community";
  placement?: "top" | "bottom";
}) {
  const pathname = usePathname();
  const tabs = variant === "community" ? communityTabs : talentTabs;
  const isBottom = placement === "bottom";

  return (
    <div
      className={
        isBottom
          ? "flex w-full items-stretch justify-around gap-0.5 px-1 pt-1"
          : "flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
      }
      role={isBottom ? undefined : "navigation"}
      aria-label={isBottom ? undefined : "App"}
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const showBadge = tab.href === "/inbox" && inboxUnread > 0;
        const Icon = tab.icon;

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
                  {inboxUnread > 99 ? "99+" : inboxUnread}
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
                {inboxUnread > 99 ? "99+" : inboxUnread}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
