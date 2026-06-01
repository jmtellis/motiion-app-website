"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AccountPill, type AccountPillUser } from "@/components/auth/AccountPill";
import { MotiionBrandMark } from "@/components/brand/MotiionBrandMark";
import { JOIN_BETA_CTA } from "@/lib/marketing/marketing-pages";

const homeTabs = [
  { label: "For Talent", href: "/for-talent" },
  { label: "For Clients", href: "/for-clients" },
  { label: "For Agents", href: "/for-agents" },
] as const;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function HomeMarketingHeaderClient({
  accountUser,
  darkTheme = false,
}: {
  accountUser: AccountPillUser | null;
  darkTheme?: boolean;
}) {
  const [pastHero, setPastHero] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const headerFilled = pastHero || scrolled;

  useEffect(() => {
    const onPastHero = (event: Event) => {
      const detail = (event as CustomEvent<{ pastHero: boolean }>).detail;
      setPastHero(detail.pastHero);
    };

    const onScroll = () => {
      setScrolled(window.scrollY > 16);
    };

    onScroll();
    window.addEventListener("home-past-hero", onPastHero);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("home-past-hero", onPastHero);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500 ease-out motion-reduce:transition-none",
        headerFilled
          ? darkTheme
            ? "border-white/10 bg-[#0a1214]/92 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl"
            : "border-[var(--line)]/80 bg-[var(--paper)]/95 shadow-[0_8px_30px_rgba(17,17,17,0.06)] backdrop-blur-xl"
          : "border-transparent bg-transparent shadow-none backdrop-blur-none",
      )}
    >
      <div className="relative mx-auto flex min-h-[4.25rem] w-full max-w-6xl items-center px-6 py-3 lg:px-10">
        {/* Past hero: audience tabs on the left only */}
        <nav
          aria-label="Primary"
          className={cn(
            "flex min-w-0 flex-1 items-center gap-6 overflow-hidden transition-all duration-500 ease-out motion-reduce:transition-none lg:gap-8",
            pastHero ? "max-w-none opacity-100" : "pointer-events-none max-w-0 opacity-0",
          )}
        >
          {homeTabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={
                darkTheme
                  ? "hidden shrink-0 border-b-2 border-transparent pb-0.5 text-sm font-semibold whitespace-nowrap text-white/60 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] md:inline-block"
                  : "hidden shrink-0 border-b-2 border-transparent pb-0.5 text-sm font-semibold whitespace-nowrap text-[var(--ink-soft)] transition-colors hover:border-[var(--line)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] md:inline-block"
              }
              tabIndex={pastHero ? 0 : -1}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        {/* Logo always centered in the header bar */}
        <Link
          href="/"
          className="absolute top-1/2 left-1/2 z-10 inline-flex -translate-x-1/2 -translate-y-1/2 items-center transition-opacity duration-500 hover:opacity-80 motion-reduce:transition-none"
          aria-label="Motiion home"
        >
          <MotiionBrandMark priority inverted={darkTheme || !pastHero} />
        </Link>

        {/* Actions — right */}
        <div className="relative z-10 flex flex-1 items-center justify-end gap-2 sm:gap-3">
          {accountUser ? (
            <AccountPill user={accountUser} />
          ) : (
            <Link
              href={JOIN_BETA_CTA.href}
              className={cn("btn-primary shrink-0 text-sm", darkTheme && "btn-on-dark")}
            >
              {JOIN_BETA_CTA.label}
            </Link>
          )}
        </div>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-500 ease-out motion-reduce:transition-none md:hidden",
          pastHero ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <nav
          aria-label="Primary mobile"
          className={cn(
            darkTheme
              ? "overflow-hidden border-t border-white/10 px-4 transition-opacity duration-500 ease-out"
              : "overflow-hidden border-t border-[var(--line)]/60 px-4 transition-opacity duration-500 ease-out",
            pastHero ? "py-2 opacity-100" : "opacity-0",
          )}
        >
          <div className="flex gap-1 overflow-x-auto">
            {homeTabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={
                  darkTheme
                    ? "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-white/65 transition hover:bg-white/10"
                    : "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--ink-soft)] transition hover:bg-white/80"
                }
                tabIndex={pastHero ? 0 : -1}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
