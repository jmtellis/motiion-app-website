"use client";

import Link from "next/link";
import { useCallback, useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { AccountPill, type AccountPillUser } from "@/components/auth/AccountPill";
import { MotiionWordmark } from "@/components/brand/MotiionWordmark";
import { HomeSplitMobileMenu, HomeSplitNav } from "@/components/landing/HomeSplitNav";
import { IosDownloadHeroButton } from "@/components/landing/IosDownloadHeroButton";
import { MarketingDialog } from "@/components/landing/MarketingDialog";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import {
  createAccountHeroCta,
  homeHero,
  homeLoginCta,
} from "@/lib/marketing/homepage-content";

import "./home-split-landing.css";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function CreateAccountButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("home-split__cta-primary", className)}
      >
        {createAccountHeroCta.label}
      </button>

      {open ? (
        <MarketingDialog
          onClose={close}
          title={createAccountHeroCta.modal.title}
          description={createAccountHeroCta.modal.description}
          titleId={titleId}
          descriptionId={descriptionId}
        >
          <ul className="flex flex-col gap-2" role="list">
            {createAccountHeroCta.modal.paths.map((path) => (
              <li key={path.id}>
                <Link
                  href={path.href}
                  onClick={close}
                  className="group flex w-full flex-col rounded-[14px] border border-[#262626] bg-[#1e1e1e] px-4 py-3.5 text-left transition-colors hover:border-[#3a3a3a] hover:bg-[#2a2a2a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  <span className="text-sm font-semibold text-[#fafafa]">{path.label}</span>
                  <span className="mt-1 text-sm leading-snug text-[#a3a3a3]">{path.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </MarketingDialog>
      ) : null}
    </>
  );
}

function LoginControl({
  accountUser,
  onDark = false,
}: {
  accountUser: AccountPillUser | null;
  onDark?: boolean;
}) {
  if (accountUser) {
    return <AccountPill user={accountUser} />;
  }

  return (
    <Link
      href={homeLoginCta.href}
      className={cn("home-split__login", onDark && "home-split__login--on-dark")}
    >
      {homeLoginCta.label}
    </Link>
  );
}

function HomeSplitFooter() {
  const year = new Date().getFullYear();

  return (
    <div className="home-split__footer">
      <p className="home-split__footer-copy">© {year} Motiion Ventures, Inc.</p>
    </div>
  );
}

export function HomeSplitLanding({
  accountUser = null,
}: {
  accountUser?: AccountPillUser | null;
}) {
  const reduceMotion = useReducedMotion();

  const enter = reduceMotion
    ? { initial: false as const, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
      };

  return (
    <div className="home-split">
      <div className="home-split__grain" aria-hidden />

      <div className="home-split__mobile-bar">
        <HomeSplitMobileMenu />
        <Link href="/" className="home-split__mobile-bar-logo" aria-label="Motiion home">
          <MotiionWordmark priority height={11} />
        </Link>
        <LoginControl accountUser={accountUser} onDark />
      </div>

      <section className="home-split__panel home-split__panel--dark" aria-label="Motiion">
        <div className="home-split__header-row home-split__header-row--dark">
          <div className="home-split__brand-nav">
            <Link
              href="/"
              className="home-split__wordmark inline-flex items-center"
              aria-label="Motiion home"
            >
              <MotiionWordmark priority height={12} />
            </Link>
            <HomeSplitNav />
          </div>
        </div>

        <div className="home-split__content">
          <motion.div
            className="home-split__copy"
            initial={enter.initial}
            animate={enter.animate}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="home-split__eyebrow">{homeHero.eyebrow}</p>
            <h1 className="home-split__headline">
              {homeHero.headline.parts.map((part, index) =>
                typeof part === "string" ? (
                  <span key={index}>{part}</span>
                ) : (
                  <strong
                    key={index}
                    className={part.accent ? "type-emphasis-accent" : part.emphasis ? "type-emphasis" : undefined}
                  >
                    {part.text}
                  </strong>
                ),
              )}
            </h1>
            <p className="home-split__subtext">{homeHero.subtext}</p>
          </motion.div>

          <motion.div
            className="home-split__ctas"
            initial={enter.initial}
            animate={enter.animate}
            transition={{ duration: 0.55, delay: reduceMotion ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <IosDownloadHeroButton dark variant="ghost" className="sm:min-w-0" />
            <CreateAccountButton />
          </motion.div>
        </div>

        <HomeSplitFooter />
      </section>

      <section className="home-split__panel home-split__panel--light" aria-label="Featured dancers">
        <div className="home-split__visual home-split__visual--portraits">
          <div className="home-split__login-anchor">
            <LoginControl accountUser={accountUser} onDark />
          </div>

          <div className="home-split__feature home-split__feature--portraits">
            <MarketingHero />
          </div>
        </div>
      </section>
    </div>
  );
}
