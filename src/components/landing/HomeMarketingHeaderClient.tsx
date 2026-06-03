"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

import { AccountPill, type AccountPillUser } from "@/components/auth/AccountPill";
import { MotiionBrandMark } from "@/components/brand/MotiionBrandMark";
import { useBetaSignupModal } from "@/components/landing/BetaSignupModalProvider";
import { JOIN_BETA_CTA } from "@/lib/marketing/marketing-pages";

const homeTabs = [
  { label: "Dancers", href: "/for-talent" },
  { label: "Choreographers & Casting", href: "/for-casting" },
] as const;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function sideRevealClass(visible: boolean, side: "left" | "right") {
  return cn(
    "transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none",
    visible
      ? "translate-x-0 opacity-100"
      : cn("pointer-events-none opacity-0", side === "left" ? "-translate-x-2" : "translate-x-2"),
  );
}

export function HomeMarketingHeaderClient({
  accountUser,
  darkTheme = false,
}: {
  accountUser: AccountPillUser | null;
  darkTheme?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [pastHero, setPastHero] = useState(false);
  const { openBetaSignup } = useBetaSignupModal();

  useEffect(() => {
    const sentinel = document.getElementById("home-hero-end");
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setPastHero(!entry.isIntersecting),
      { threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const showSideContent = pastHero || !!reduceMotion;

  const tabClass = darkTheme
    ? "border-b-2 border-transparent pb-0.5 text-center text-xs font-semibold whitespace-nowrap text-white/60 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:text-sm"
    : "border-b-2 border-transparent pb-0.5 text-center text-xs font-semibold whitespace-nowrap text-[var(--ink-soft)] transition-colors hover:border-[var(--line)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:text-sm";

  const mobileTabClass = cn(tabClass, "flex flex-1 items-center justify-center min-w-0");

  const logoLink = (
    <Link
      href="/"
      className="inline-flex items-center transition-opacity duration-500 hover:opacity-80 motion-reduce:transition-none md:absolute md:top-1/2 md:left-1/2 md:z-10 md:-translate-x-1/2 md:-translate-y-1/2"
      aria-label="Motiion home"
    >
      <MotiionBrandMark priority inverted={darkTheme || !pastHero} />
    </Link>
  );

  const actions = accountUser ? (
    <AccountPill user={accountUser} />
  ) : (
    <button
      type="button"
      onClick={openBetaSignup}
      className={cn("btn-primary shrink-0 text-sm", darkTheme && "btn-on-dark")}
    >
      {JOIN_BETA_CTA.label}
    </button>
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b max-md:border-b-0 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500 ease-out motion-reduce:transition-none",
        pastHero
          ? darkTheme
            ? "border-transparent bg-transparent shadow-none backdrop-blur-none md:border-white/10 md:bg-black/92 md:shadow-[0_8px_30px_rgba(0,0,0,0.35)] md:backdrop-blur-xl"
            : "border-transparent bg-transparent shadow-none backdrop-blur-none md:border-[var(--line)]/80 md:bg-[var(--paper)]/95 md:shadow-[0_8px_30px_rgba(17,17,17,0.06)] md:backdrop-blur-xl"
          : "border-transparent bg-transparent shadow-none backdrop-blur-none",
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col md:hidden">
        <div className={cn("flex justify-center px-6 pt-3", showSideContent ? "pb-0" : "pb-3")}>
          {logoLink}
        </div>
        <nav
          aria-label="Primary"
          aria-hidden={!showSideContent}
          className={cn(
            "flex w-full overflow-hidden px-4 transition-[opacity,max-height,padding] duration-500 ease-out motion-reduce:transition-none",
            showSideContent ? "max-h-16 pb-3 opacity-100" : "pointer-events-none max-h-0 pb-0 opacity-0",
          )}
        >
          {homeTabs.map((tab) => (
            <Link key={tab.href} href={tab.href} className={mobileTabClass} tabIndex={showSideContent ? 0 : -1}>
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="relative mx-auto hidden min-h-[4.25rem] w-full max-w-6xl items-center gap-3 px-6 py-3 md:flex lg:gap-4 lg:px-10">
        <nav
          aria-label="Primary"
          aria-hidden={!showSideContent}
          className={cn("flex min-w-0 flex-1 items-center gap-6 lg:gap-8", sideRevealClass(showSideContent, "left"))}
        >
          {homeTabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(tabClass, "shrink-0")}
              tabIndex={showSideContent ? 0 : -1}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        {logoLink}

        <div
          aria-hidden={!showSideContent}
          className={cn(
            "relative z-10 flex flex-1 items-center justify-end gap-2 sm:gap-3",
            sideRevealClass(showSideContent, "right"),
          )}
        >
          {actions}
        </div>
      </div>
    </header>
  );
}
