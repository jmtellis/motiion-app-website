"use client";

import "lenis/dist/lenis.css";

import Lenis from "lenis";
import { useReducedMotion } from "motion/react";
import { useEffect, type ReactNode } from "react";

/** Shared Lenis tuning for marketing and public product pages. */
export const MARKETING_LENIS_OPTIONS = {
  lerp: 0.075,
  duration: 1.25,
  smoothWheel: true,
  syncTouch: false,
  wheelMultiplier: 0.9,
  overscroll: false,
} as const;

type UseSmoothScrollOptions = {
  enabled?: boolean;
  wrapper?: HTMLElement | null;
  content?: HTMLElement | null;
};

export function useSmoothScroll({
  enabled = true,
  wrapper = null,
  content = null,
}: UseSmoothScrollOptions = {}) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!enabled || reduceMotion) return;
    if ((wrapper && !content) || (!wrapper && content)) return;

    const lenis = new Lenis({
      ...MARKETING_LENIS_OPTIONS,
      ...(wrapper && content
        ? {
            wrapper,
            content,
            eventsTarget: wrapper,
          }
        : {}),
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    const resizeTargets = new Set<HTMLElement>();
    if (content instanceof HTMLElement) resizeTargets.add(content);
    if (wrapper instanceof HTMLElement && wrapper !== content) resizeTargets.add(wrapper);

    let resizeObserver: ResizeObserver | null = null;
    if (resizeTargets.size > 0 && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        lenis.resize();
      });
      for (const target of resizeTargets) resizeObserver.observe(target);
    }

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      lenis.destroy();
    };
  }, [content, enabled, reduceMotion, wrapper]);
}

type SmoothScrollProps = {
  children: ReactNode;
  /** Enable inertia smoothing on marketing pages */
  enabled?: boolean;
};

export function SmoothScroll({ children, enabled = true }: SmoothScrollProps) {
  useSmoothScroll({ enabled });
  return children;
}
