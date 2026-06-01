"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/home", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/inbox", label: "Inbox" },
  { href: "/portfolio", label: "Portfolio" },
] as const;

export function AppTabNav({ inboxUnread = 0 }: { inboxUnread?: number }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="App"
      className="border-b border-[var(--line)] bg-[var(--paper)]"
    >
      <div className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-6 lg:px-10">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const showBadge = tab.href === "/inbox" && inboxUnread > 0;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                active
                  ? "border-[var(--accent-dark)] text-[var(--ink)]"
                  : "border-transparent text-[var(--ink-soft)] hover:border-[var(--line)] hover:text-[var(--ink)]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
              {showBadge ? (
                <span className="ml-1.5 inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold text-[#0a0a0a]">
                  {inboxUnread > 99 ? "99+" : inboxUnread}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
