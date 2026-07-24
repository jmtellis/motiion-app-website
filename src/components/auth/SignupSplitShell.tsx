"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

import { AuthSplitLink, AuthSplitTransitionProvider } from "@/components/auth/AuthSplitTransition";
import { MotiionWordmark } from "@/components/brand/MotiionWordmark";
import { HomeSplitNav } from "@/components/landing/HomeSplitNav";
import { ScrollMarquee } from "@/components/landing/ScrollMarquee";
import { MarketingBodySurface } from "@/components/landing/MarketingBodySurface";
import { SmoothScroll } from "@/components/landing/SmoothScroll";

import "@/components/landing/home-split-landing.css";
import "@/app/signup/signup-split.css";

export type SignupSplitStep = {
  number: number;
  label: string;
  active?: boolean;
  status?: "completed" | "active" | "pending";
};

function resolveStepStatus(step: SignupSplitStep): "completed" | "active" | "pending" {
  if (step.status) return step.status;
  if (step.active) return "active";
  return "pending";
}

export type SignupSplitCoverLink = {
  prefix: string;
  href: string;
  label: string;
};

export type SignupSplitMarquee = {
  segments: readonly string[];
  direction?: "left" | "right";
};

type SignupSplitShellProps = {
  headline: string;
  subtext: string;
  steps: SignupSplitStep[];
  showSteps?: boolean;
  /**
   * When false, cover header shows wordmark only (no Community/Talent/Industry nav).
   * Used for onboarding so the left panel stays quiet.
   */
  showNav?: boolean;
  /** When false, hides the Motiion wordmark in the cover header (onboarding). */
  showWordmark?: boolean;
  /** Single full-viewport panel (no left cover). Used for onboarding complete. */
  fullBleed?: boolean;
  /**
   * Login/signup: left panel is header + marquee only;
   * headline/subtext render in the right panel above the form.
   */
  mediaCover?: boolean;
  /** Micro-step progress shown above the left-panel headline during onboarding. */
  progressLabel?: string;
  progressCurrent?: number;
  progressTotal?: number;
  /** Rendered in the cover header (top-left), e.g. Cancel during onboarding. */
  coverAction?: ReactNode;
  marquee?: SignupSplitMarquee;
  coverAltLinks?: readonly SignupSplitCoverLink[];
  children: ReactNode;
};

const ENTER_EASE = [0.22, 1, 0.36, 1] as const;

export function SignupSplitShell({
  headline,
  subtext,
  steps,
  showSteps = true,
  showNav = true,
  showWordmark = true,
  fullBleed = false,
  mediaCover = false,
  progressLabel,
  progressCurrent,
  progressTotal,
  coverAction,
  marquee,
  coverAltLinks,
  children,
}: SignupSplitShellProps) {
  const reduceMotion = useReducedMotion();
  const enter = reduceMotion
    ? { initial: false as const, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
      };
  const delay = (ms: number) => (reduceMotion ? 0 : ms);
  const showCoverSteps = !fullBleed && !mediaCover && showSteps && steps.length > 0;
  const showCoverProgress =
    !fullBleed &&
    !mediaCover &&
    progressCurrent !== undefined &&
    progressTotal !== undefined &&
    progressTotal > 0;

  return (
    <AuthSplitTransitionProvider>
      <SmoothScroll>
        <MarketingBodySurface dark />
        <div className={`signup-split${fullBleed ? " signup-split--full-bleed" : ""}`}>
          {!fullBleed ? (
            <aside className="signup-split-cover relative">
              <motion.div
                className="signup-split-cover__header"
                initial={enter.initial}
                animate={enter.animate}
                transition={{ duration: 0.5, ease: ENTER_EASE }}
              >
                <div className="home-split__brand-nav">
                  {coverAction ? (
                    <div className="signup-split-cover__header-action">{coverAction}</div>
                  ) : showWordmark ? (
                    <Link
                      href="/"
                      className="home-split__wordmark inline-flex items-center"
                      aria-label="Motiion home"
                    >
                      <MotiionWordmark priority height={12} />
                    </Link>
                  ) : (
                    <span />
                  )}
                  {showNav ? <HomeSplitNav /> : null}
                </div>
              </motion.div>
              <div className="signup-split-cover__content">
                {showNav ? <HomeSplitNav mobile /> : null}
                {!mediaCover ? (
                  <div className="signup-split-cover__main">
                    <motion.div
                      className="signup-split-cover__intro"
                      initial={enter.initial}
                      animate={enter.animate}
                      transition={{ duration: 0.55, delay: delay(0.06), ease: ENTER_EASE }}
                    >
                      {showCoverProgress ? (
                        <div className="signup-split-cover__progress">
                          <div
                            className="signup-split-cover__progress-dots"
                            role="progressbar"
                            aria-valuenow={progressCurrent}
                            aria-valuemin={1}
                            aria-valuemax={progressTotal}
                            aria-label={
                              progressLabel
                                ? `${progressLabel}: step ${progressCurrent} of ${progressTotal}`
                                : `Step ${progressCurrent} of ${progressTotal}`
                            }
                          >
                            {Array.from({ length: progressTotal }, (_, index) => {
                              const stepNumber = index + 1;
                              const state =
                                stepNumber < progressCurrent
                                  ? "completed"
                                  : stepNumber === progressCurrent
                                    ? "active"
                                    : "pending";

                              return (
                                <span
                                  key={stepNumber}
                                  className={`signup-split-cover__progress-dot signup-split-cover__progress-dot--${state}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                      <p className="signup-split-cover__headline">{headline}</p>
                      <p className="signup-split-cover__subtext">{subtext}</p>
                    </motion.div>
                    {showCoverSteps ? (
                      <motion.ol
                        className="signup-split-steps"
                        aria-label="Setup steps"
                        initial={enter.initial}
                        animate={enter.animate}
                        transition={{ duration: 0.55, delay: delay(0.12), ease: ENTER_EASE }}
                      >
                        {steps.map((step) => {
                          const status = resolveStepStatus(step);

                          return (
                            <li
                              key={step.number}
                              className={`signup-split-step signup-split-step--${status}`}
                              aria-current={status === "active" ? "step" : undefined}
                            >
                              <span className="signup-split-step__num" aria-hidden>
                                {status === "completed" ? (
                                  <Check className="size-3.5" strokeWidth={2.5} />
                                ) : (
                                  step.number
                                )}
                              </span>
                              <span>{step.label}</span>
                            </li>
                          );
                        })}
                      </motion.ol>
                    ) : null}
                  </div>
                ) : (
                  <div className="signup-split-cover__main" aria-hidden />
                )}
                {coverAltLinks?.length || (marquee && marquee.segments.length > 0) ? (
                  <motion.div
                    className="signup-split-cover__footer"
                    initial={enter.initial}
                    animate={enter.animate}
                    transition={{ duration: 0.55, delay: delay(0.18), ease: ENTER_EASE }}
                  >
                    {coverAltLinks && coverAltLinks.length > 0 ? (
                      <nav className="signup-split-cover__alt-links" aria-label="Other account options">
                        {coverAltLinks.map((item) => (
                          <p key={`${item.href}-${item.label}`} className="signup-split-cover__alt-link">
                            {item.prefix}{" "}
                            <AuthSplitLink href={item.href}>{item.label}</AuthSplitLink>
                          </p>
                        ))}
                      </nav>
                    ) : null}
                    {marquee && marquee.segments.length > 0 ? (
                      <div className="signup-split-cover__marquee" aria-hidden>
                        <ScrollMarquee
                          segments={marquee.segments}
                          direction={marquee.direction ?? "left"}
                          variant="outline"
                          dark
                          className="signup-split-marquee py-2 md:py-3"
                        />
                      </div>
                    ) : null}
                  </motion.div>
                ) : null}
              </div>
            </aside>
          ) : null}
          <motion.main
            className={`signup-split-panel${mediaCover ? "" : " signup-split-panel--setup"}${fullBleed ? " signup-split-panel--full-bleed" : ""}`}
            data-lenis-prevent
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: delay(0.1), ease: ENTER_EASE }}
          >
            {mediaCover ? (
              <div className="signup-split-form">
                <SignupSplitFormHeader title={headline} />
                {children}
              </div>
            ) : (
              children
            )}
          </motion.main>
        </div>
      </SmoothScroll>
    </AuthSplitTransitionProvider>
  );
}

export function SignupSplitFormHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="signup-split-form__header">
      <h1 className="signup-split-form__title">{title}</h1>
      {subtitle ? <p className="signup-split-form__subtitle">{subtitle}</p> : null}
    </div>
  );
}
