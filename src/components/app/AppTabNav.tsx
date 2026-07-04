"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { trackClientEvent } from "@/lib/analytics/track-client";

const tabs = [
  { href: "/home", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/inbox", label: "Inbox" },
  { href: "/portfolio", label: "Portfolio" },
] as const;

/** Inline nav tabs for the single-row app bar. */
export function AppTabNav({ inboxUnread = 0 }: { inboxUnread?: number }) {
  const pathname = usePathname();

  return (
    <nav aria-label="App" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const showBadge = tab.href === "/inbox" && inboxUnread > 0;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={() => {
              trackClientEvent("app_tab_viewed", { tab: tab.label.toLowerCase() }, tab.href);
            }}
            className={`relative shrink-0 rounded-[8px] px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-[#1e1e1e] text-[#fafafa]"
                : "text-[#8a8a8a] hover:bg-[#151515] hover:text-[#eaeaea]"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
            {showBadge ? (
              <span className="ml-1.5 inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-[var(--accent)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#04231e]">
                {inboxUnread > 99 ? "99+" : inboxUnread}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
