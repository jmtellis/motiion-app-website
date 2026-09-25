"use client";

import { IosDownloadHeroButton } from "./IosDownloadHeroButton";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";

import { AccountPill, type AccountPillUser } from "@/components/auth/AccountPill";
import { MotiionBrandMark } from "@/components/brand/MotiionBrandMark";
import { MotiionScrolledWordmark } from "@/components/brand/MotiionScrolledWordmark";
import { useLandingAudienceOptional } from "@/components/landing/LandingAudienceContext";
import { homeSignupScrollCta } from "@/lib/marketing/homepage-content";
import {
  INDUSTRY_PRO_SIGNUP_CTA,
  JOIN_BETA_CTA,
  type MarketingHeaderTab,
} from "@/lib/marketing/marketing-pages";
import { scrollToSignupSection } from "@/lib/marketing/scroll-to-signup";

function getHeaderSignupCta(activeTab: MarketingHeaderTab) {
  if (activeTab === "casting") return INDUSTRY_PRO_SIGNUP_CTA;
  if (activeTab === "talent" || activeTab === "community") return JOIN_BETA_CTA;
  return { label: homeSignupScrollCta.label, href: "#signup" } as const;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const HERO_REVEAL_SCROLL_RATIO = 1 / 3;

function getHeroRevealThreshold(overlayHero: boolean) {
  if (overlayHero) {
    const hero = document.querySelector<HTMLElement>(".home-split");
    if (hero) return Math.max(hero.offsetHeight * 0.4, 220);
  }
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
  headerCta,
  signupScrolls,
  accountUser,
  wordmark,
}: {
  headerCta: { label: string; href: string };
  signupScrolls: boolean;
  accountUser: AccountPillUser | null;
  wordmark: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2 px-6 py-3">
      <div className="flex min-w-0 items-center justify-start">{wordmark}</div>
      <div className="flex items-center justify-end">
        {accountUser ? (
          <AccountPill user={accountUser} />
        ) : signupScrolls ? (
          <button
            type="button"
            className="btn-hero-pill btn-hero-pill-accent btn-hero-pill-compact whitespace-nowrap"
            onClick={scrollToSignupSection}
          >
            {headerCta.label}
          </button>
        ) : (
          <Link
            href={headerCta.href}
            className="btn-hero-pill btn-hero-pill-accent btn-hero-pill-compact whitespace-nowrap"
          >
            {headerCta.label}
          </Link>
        )}
      </div>
    </div>
  );
}

export function HomeMarketingHeaderClient({
  accountUser,
  activeTab = null,
  darkTheme = false,
  wordmarkHeader = false,
  overlayHero = false,
}: {
  accountUser: AccountPillUser | null;
  activeTab?: MarketingHeaderTab;
  darkTheme?: boolean;
  /** Audience pages: always show wordmark and CTA (no resting emblem). */
  wordmarkHeader?: boolean;
  overlayHero?: boolean;
  showAudienceTabs?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const landingAudience = useLandingAudienceOptional();
  const [pastHero, setPastHero] = useState(wordmarkHeader);
  const [menuOpen, setMenuOpen] = useState(false);
  const [compactHeader, setCompactHeader] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => {
      setCompactHeader(query.matches);
      if (!query.matches) setMenuOpen(false);
    };
    update();
    query.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      query.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    if (wordmarkHeader) return;

    function updatePastHero() {
      if (overlayHero) {
        setPastHero(window.scrollY > 2);
        return;
      }
      setPastHero(window.scrollY >= getHeroRevealThreshold(false));
    }

    updatePastHero();
    window.addEventListener("scroll", updatePastHero, { passive: true });
    window.addEventListener("resize", updatePastHero);
    // Lenis anchor/lerp scrolling does not always emit window scroll events.
    const interval = window.setInterval(updatePastHero, overlayHero ? 50 : 200);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("scroll", updatePastHero);
      window.removeEventListener("resize", updatePastHero);
    };
  }, [overlayHero, wordmarkHeader]);

  void reduceMotion;

  const showScrolled = wordmarkHeader || pastHero;
  const headerCta = getHeaderSignupCta(landingAudience?.audience ?? activeTab);
  const signupScrolls = headerCta.href.startsWith("#");

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

  if (overlayHero) {
    const closeMenu = () => setMenuOpen(false);
    return (
      <header className={cn("landing-header", showScrolled && "is-visible", menuOpen && "is-menu-open")}>
        <div className="landing-header__inner">
          <Link href="/" className="landing-header__brand" aria-label="Motiion home"><MotiionScrolledWordmark priority /></Link>
          {compactHeader ? (
            <div className="landing-header__menu">
              <button type="button" className="landing-header__menu-toggle" aria-expanded={menuOpen} aria-controls="landing-header-menu" onClick={() => setMenuOpen(open => !open)}>
                {menuOpen ? <X aria-hidden /> : <Menu aria-hidden />}
                <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
              </button>
              <nav id="landing-header-menu" aria-label="Account and download" className="landing-header__menu-panel" inert={!menuOpen} aria-hidden={!menuOpen}>
                <Link href="/pricing" className="landing-header__menu-item" onClick={closeMenu}>Pricing</Link>
                {accountUser ? <AccountPill user={accountUser} /> : <>
                  <Link href="/login" className="landing-header__menu-item" onClick={closeMenu}>Login</Link>
                  <Link href="/signup" className="landing-header__menu-item" onClick={closeMenu}>Create Account</Link>
                </>}
                <IosDownloadHeroButton label="Download" className="landing-header__download landing-header__menu-item" />
              </nav>
            </div>
          ) : (
            <div className="landing-header__end landing-header__desktop-actions">
              <Link href="/pricing" className="landing-header__pricing">Pricing</Link>
              <IosDownloadHeroButton label="Download" className="landing-header__download" />
              <span className="landing-header__action-divider" aria-hidden />
              {accountUser ? <AccountPill user={accountUser} /> : <>
                <Link href="/login" className="home-split__login">Login</Link>
                <Link href="/signup" className="mkt-btn mkt-btn--primary landing-header__signup">Create Account</Link>
              </>}
            </div>
          )}
        </div>
      </header>
    );
  }

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
          {showScrolled ? null : (
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
