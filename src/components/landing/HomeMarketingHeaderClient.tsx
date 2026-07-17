"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";

import { AccountPill, type AccountPillUser } from "@/components/auth/AccountPill";
import { MotiionBrandMark } from "@/components/brand/MotiionBrandMark";
import { MotiionScrolledWordmark } from "@/components/brand/MotiionScrolledWordmark";
import { homeSignupScrollCta } from "@/lib/marketing/homepage-content";
import {
  INDUSTRY_PRO_SIGNUP_CTA,
  JOIN_BETA_CTA,
  type MarketingHeaderTab,
  type MarketingTab,
} from "@/lib/marketing/marketing-pages";
import { scrollToSignupSection } from "@/lib/marketing/scroll-to-signup";

const marketingTabs: { id: MarketingTab; label: string; href: string }[] = [
  { id: "talent", label: "Creative Talent", href: "/for-talent" },
  { id: "casting", label: "Industry Professionals", href: "/for-casting" },
];

function getHeaderSignupCta(activeTab: MarketingHeaderTab) {
  if (activeTab === "casting") return INDUSTRY_PRO_SIGNUP_CTA;
  if (activeTab === "talent") return JOIN_BETA_CTA;
  return { label: homeSignupScrollCta.label, href: "#signup" } as const;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const HERO_REVEAL_SCROLL_RATIO = 1 / 3;

function getHeroRevealThreshold() {
  return window.innerHeight * HERO_REVEAL_SCROLL_RATIO;
}

function sideRevealClass(visible: boolean, side: "left" | "right") {
  return cn(
    "transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none",
    visible
      ? "translate-x-0 opacity-100"
      : cn("pointer-events-none opacity-0", side === "left" ? "-translate-x-2" : "translate-x-2"),
  );
}

function MarketingHeaderMobileScrolledBar({
  open,
  onOpenChange,
  activeTab,
  darkTheme,
  headerCta,
  signupScrolls,
  accountUser,
  wordmark,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: MarketingHeaderTab;
  darkTheme: boolean;
  headerCta: { label: string; href: string };
  signupScrolls: boolean;
  accountUser: AccountPillUser | null;
  wordmark: ReactNode;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onOpenChange]);

  const menuLinkClass = (active: boolean) =>
    cn(
      "block rounded-full px-3 py-3 text-sm font-medium transition-colors",
      darkTheme
        ? active
          ? "bg-[#151515] text-[#fafafa]"
          : "text-[#eaeaea] hover:bg-[#151515]"
        : active
          ? "bg-[var(--ink)] text-white"
          : "text-[var(--ink)] hover:bg-[var(--line)]/40",
    );

  return (
    <div ref={rootRef} className="relative">
      <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 px-6 py-3">
        <div className="flex items-center justify-start">
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center text-white transition hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => onOpenChange(!open)}
          >
            {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
          </button>
        </div>
        <div className="flex min-w-0 items-center justify-center">{wordmark}</div>
        <div aria-hidden className="size-10" />
      </div>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute inset-x-0 top-full z-50 border-b border-[#262626] bg-[var(--stage-black)]/98 px-6 py-4 backdrop-blur-md"
        >
          <nav aria-label="Primary mobile" className="flex flex-col gap-1">
            {marketingTabs.map((tab) => {
              const active = activeTab !== null && activeTab === tab.id;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  role="menuitem"
                  className={menuLinkClass(active)}
                  aria-current={active ? "page" : undefined}
                  onClick={() => onOpenChange(false)}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-[#262626] pt-4">
            {accountUser ? (
              <Link
                href={accountUser.profileHref}
                role="menuitem"
                className={menuLinkClass(false)}
                onClick={() => onOpenChange(false)}
              >
                Account
              </Link>
            ) : signupScrolls ? (
              <button
                type="button"
                role="menuitem"
                className="btn-hero-pill btn-hero-pill-accent w-full justify-center"
                onClick={() => {
                  onOpenChange(false);
                  scrollToSignupSection();
                }}
              >
                {headerCta.label}
              </button>
            ) : (
              <Link
                href={headerCta.href}
                role="menuitem"
                className="btn-hero-pill btn-hero-pill-accent w-full justify-center"
                onClick={() => onOpenChange(false)}
              >
                {headerCta.label}
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function HomeMarketingHeaderClient({
  accountUser,
  activeTab = null,
  darkTheme = false,
  wordmarkHeader = false,
}: {
  accountUser: AccountPillUser | null;
  activeTab?: MarketingHeaderTab;
  darkTheme?: boolean;
  /** Audience pages: always show wordmark, tabs, and CTA (no resting emblem). */
  wordmarkHeader?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [pastHero, setPastHero] = useState(wordmarkHeader);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (wordmarkHeader) return;

    function updatePastHero() {
      setPastHero(window.scrollY >= getHeroRevealThreshold());
    }

    updatePastHero();
    window.addEventListener("scroll", updatePastHero, { passive: true });
    window.addEventListener("resize", updatePastHero);

    return () => {
      window.removeEventListener("scroll", updatePastHero);
      window.removeEventListener("resize", updatePastHero);
    };
  }, [wordmarkHeader]);

  void reduceMotion;

  const showScrolled = wordmarkHeader || pastHero;

  useEffect(() => {
    if (showScrolled) return;
    setMobileMenuOpen(false);
  }, [showScrolled]);

  const headerCta = getHeaderSignupCta(activeTab);
  const signupScrolls = headerCta.href.startsWith("#");

  const tabClass = (active: boolean) =>
    darkTheme
      ? active
        ? "rounded-full bg-[#151515] px-3 py-1.5 text-center text-xs font-medium whitespace-nowrap text-[#fafafa] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:text-sm"
        : "rounded-full px-3 py-1.5 text-center text-xs font-medium whitespace-nowrap text-[#8a8a8a] transition-colors hover:bg-[#151515] hover:text-[#eaeaea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:text-sm"
      : active
        ? "border-b-2 border-[var(--accent-dark)] pb-0.5 text-center text-xs font-semibold whitespace-nowrap text-[var(--ink)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:text-sm"
        : "border-b-2 border-transparent pb-0.5 text-center text-xs font-semibold whitespace-nowrap text-[var(--ink-soft)] transition-colors hover:border-[var(--line)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:text-sm";

  const restingLogoLink = (
    <Link
      href="/"
      className="inline-flex items-center transition-opacity duration-500 hover:opacity-80 motion-reduce:transition-none"
      aria-label="Motiion home"
    >
      <MotiionBrandMark priority inverted={darkTheme} />
    </Link>
  );

  const mobileScrolledWordmarkLink = (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center transition-opacity duration-500 hover:opacity-80 motion-reduce:transition-none",
        showScrolled ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-label="Motiion home"
      tabIndex={showScrolled ? 0 : -1}
      aria-hidden={!showScrolled}
    >
      <MotiionScrolledWordmark />
    </Link>
  );

  const scrolledWordmarkLink = (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center transition-[opacity,transform] duration-500 ease-out hover:opacity-80 motion-reduce:transition-none",
        sideRevealClass(showScrolled, "left"),
      )}
      aria-label="Motiion home"
      tabIndex={showScrolled ? 0 : -1}
      aria-hidden={!showScrolled}
    >
      <MotiionScrolledWordmark />
    </Link>
  );

  const signupPillClass = cn(
    "btn-hero-pill btn-hero-pill-accent btn-hero-pill-compact shrink-0 whitespace-nowrap",
    sideRevealClass(showScrolled, "right"),
  );

  const signupButton = (
    <span
      aria-hidden={!showScrolled}
      className={cn(
        "inline-flex overflow-hidden transition-[max-width,opacity] duration-500 ease-out motion-reduce:transition-none",
        showScrolled ? "max-w-[9rem] opacity-100" : "pointer-events-none max-w-0 opacity-0",
      )}
    >
      {signupScrolls ? (
        <button
          type="button"
          onClick={scrollToSignupSection}
          className={signupPillClass}
          tabIndex={showScrolled ? 0 : -1}
        >
          {headerCta.label}
        </button>
      ) : (
        <Link href={headerCta.href} className={signupPillClass} tabIndex={showScrolled ? 0 : -1}>
          {headerCta.label}
        </Link>
      )}
    </span>
  );

  const actions = accountUser ? (
    <span className={cn("inline-flex", sideRevealClass(showScrolled, "right"))}>
      <AccountPill user={accountUser} />
    </span>
  ) : (
    signupButton
  );

  const desktopTabs = (
    <nav
      aria-label="Primary"
      aria-hidden={!showScrolled}
      className={cn(
        "flex items-center justify-center gap-6 transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none lg:gap-8",
        sideRevealClass(showScrolled, "left"),
      )}
    >
      {marketingTabs.map((tab) => {
        const active = activeTab !== null && activeTab === tab.id;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(tabClass(active), "shrink-0 whitespace-nowrap")}
            tabIndex={showScrolled ? 0 : -1}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b max-md:border-b-0 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500 ease-out motion-reduce:transition-none",
        showScrolled
          ? darkTheme
            ? "border-transparent bg-[var(--stage-black)]/90 shadow-none backdrop-blur-md md:border-[#262626]"
            : "border-transparent bg-transparent shadow-none md:border-[var(--line)]/80 md:bg-[var(--paper)]/95"
          : "border-transparent bg-transparent shadow-none",
      )}
    >
      <div className="marketing-header-mobile mx-auto w-full max-w-6xl md:hidden">
        {showScrolled ? (
          <MarketingHeaderMobileScrolledBar
            open={mobileMenuOpen}
            onOpenChange={setMobileMenuOpen}
            activeTab={activeTab}
            darkTheme={darkTheme}
            headerCta={headerCta}
            signupScrolls={signupScrolls}
            accountUser={accountUser}
            wordmark={mobileScrolledWordmarkLink}
          />
        ) : (
          <div className="flex justify-center px-6 pb-3 pt-3">{restingLogoLink}</div>
        )}
      </div>

      <div className="relative mx-auto hidden min-h-[4.25rem] w-full max-w-6xl px-6 py-3 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center lg:px-10">
        <div className="flex min-w-0 items-center justify-start">{showScrolled ? scrolledWordmarkLink : null}</div>

        <div className="flex items-center justify-center">
          {showScrolled ? (
            desktopTabs
          ) : (
            <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
              {restingLogoLink}
            </div>
          )}
        </div>

        <div
          className={cn(
            "relative z-10 flex items-center justify-end gap-2 sm:gap-3",
            sideRevealClass(showScrolled, "right"),
          )}
        >
          {actions}
        </div>
      </div>
    </header>
  );
}
