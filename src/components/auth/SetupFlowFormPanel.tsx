"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";

import { useSmoothScroll } from "@/components/landing/SmoothScroll";

type SetupFlowFormPanelProps = {
  title: string;
  subtitle?: string;
  /** Optional right-panel progress (used by some wizards; onboarding shows this on the left cover). */
  progressLabel?: string;
  progressPercent?: number;
  progressCurrent?: number;
  progressTotal?: number;
  showProgressMeta?: boolean;
  progressFirst?: boolean;
  /** When set, title + body animate between steps. */
  stepKey?: string;
  /** `forward` = out left / in right; `back` = out right / in left. */
  stepDirection?: "forward" | "back";
  children: ReactNode;
  footer: ReactNode;
  error?: string | null;
};

const STEP_EASE = [0.22, 1, 0.36, 1] as const;
const STEP_OFFSET = 36;

export function SetupFlowFormPanel({
  title,
  subtitle,
  progressLabel,
  progressPercent: _progressPercent,
  progressCurrent,
  progressTotal,
  showProgressMeta = true,
  progressFirst = true,
  stepKey,
  stepDirection = "forward",
  children,
  footer,
  error,
}: SetupFlowFormPanelProps) {
  void _progressPercent;
  const reduceMotion = useReducedMotion();
  const [scrollWrapper, setScrollWrapper] = useState<HTMLElement | null>(null);
  const [scrollContent, setScrollContent] = useState<HTMLElement | null>(null);
  const showProgress = progressCurrent !== undefined && progressTotal !== undefined && progressTotal > 0;
  // 1 = forward (in from right / out to left), -1 = back (in from left / out to right)
  const directionSign = stepDirection === "back" ? -1 : 1;

  useSmoothScroll({
    enabled: Boolean(scrollWrapper && scrollContent),
    wrapper: scrollWrapper,
    content: scrollContent,
  });

  const stepVariants: Variants = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: (direction: number) => ({
          opacity: 0,
          x: direction * STEP_OFFSET,
        }),
        animate: {
          opacity: 1,
          x: 0,
        },
        exit: (direction: number) => ({
          opacity: 0,
          x: direction * -STEP_OFFSET,
        }),
      };

  const titleBlock =
    title || subtitle ? (
      <div className="signup-split-form__heading">
        {title ? <h1 className="signup-split-form__title">{title}</h1> : null}
        {subtitle ? <p className="signup-split-form__subtitle">{subtitle}</p> : null}
      </div>
    ) : null;

  const progressBlock = showProgress ? (
    <div
      className={`signup-split-form__progress${progressFirst ? " signup-split-form__progress--first" : ""}`}
    >
      {showProgressMeta ? (
        <div className="signup-split-form__progress-meta">
          <span className="signup-split-form__progress-label">
            {progressLabel
              ? `${progressLabel} · ${progressCurrent} of ${progressTotal}`
              : `${progressCurrent} of ${progressTotal}`}
          </span>
        </div>
      ) : null}
      <div
        className="signup-split-form__progress-dots"
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
              className={`signup-split-form__progress-dot signup-split-form__progress-dot--${state}`}
            />
          );
        })}
      </div>
    </div>
  ) : null;

  const stepContent = (
    <>
      {titleBlock}
      <div className="signup-split-form__body">{children}</div>
      {error ? <div className="signup-split-error">{error}</div> : null}
    </>
  );

  return (
    <div className="signup-split-form signup-split-form--onboarding">
      <div ref={setScrollWrapper} className="signup-split-form__main">
        <div ref={setScrollContent} className="signup-split-form__scroll-content">
          {progressFirst ? progressBlock : null}

          {stepKey ? (
            <div className="signup-split-form__stage">
              <AnimatePresence mode="wait" initial={false} custom={directionSign}>
                <motion.div
                  key={stepKey}
                  className="signup-split-form__step"
                  custom={directionSign}
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: reduceMotion ? 0.12 : 0.32, ease: STEP_EASE }}
                >
                  {!progressFirst ? progressBlock : null}
                  {stepContent}
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            <>
              {!progressFirst ? progressBlock : null}
              {stepContent}
            </>
          )}
        </div>
      </div>

      <div className="signup-split-form__footer">{footer}</div>
    </div>
  );
}
