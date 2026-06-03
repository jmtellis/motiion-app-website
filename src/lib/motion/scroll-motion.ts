"use client";

import { useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";

/** Spring follow — filters scroll jitter while staying responsive */
export const SCROLL_SPRING = {
  stiffness: 160,
  damping: 38,
  mass: 0.2,
  restDelta: 0.0005,
} as const;

/** Tighter spring for horizontal marquees (less lag, still smooth) */
export const SCROLL_SPRING_MARQUEE = {
  stiffness: 200,
  damping: 42,
  mass: 0.15,
  restDelta: 0.0005,
} as const;

/** Softer spring for full-section scroll choreography */
export const SCROLL_SPRING_SECTION = {
  stiffness: 130,
  damping: 34,
  mass: 0.28,
  restDelta: 0.0005,
} as const;

export function easeInOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/** Low-pass filter on raw scroll progress — removes frame jitter */
type ScrollSpringConfig = {
  stiffness: number;
  damping: number;
  mass: number;
  restDelta: number;
};

export function useSmoothedScrollProgress(
  progress: MotionValue<number>,
  config: ScrollSpringConfig = SCROLL_SPRING,
): MotionValue<number> {
  const reduceMotion = useReducedMotion();
  const smoothed = useSpring(
    progress,
    reduceMotion ? { stiffness: 1000, damping: 100, mass: 0.01 } : config,
  );
  return reduceMotion ? progress : smoothed;
}

/** Ease in/out at the start and end of each scroll segment */
export function useEasedScrollProgress(progress: MotionValue<number>): MotionValue<number> {
  return useTransform(progress, (p) => easeInOutCubic(p));
}

/** Smoothed + eased — use for scroll-linked transforms */
export function useScrollProgressMotion(
  progress: MotionValue<number>,
  springConfig: ScrollSpringConfig = SCROLL_SPRING,
): MotionValue<number> {
  const smoothed = useSmoothedScrollProgress(progress, springConfig);
  return useEasedScrollProgress(smoothed);
}
