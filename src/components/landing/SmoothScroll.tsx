"use client";

import "lenis/dist/lenis.css";

import Lenis from "lenis";
import { useReducedMotion } from "motion/react";
import { useEffect, type ReactNode } from "react";

type SmoothScrollProps = {
  children: ReactNode;
  /** Enable inertia smoothing on marketing pages */
  enabled?: boolean;
};

export function SmoothScroll({ children, enabled = true }: SmoothScrollProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!enabled || reduceMotion) return;

    const lenis = new Lenis({
      lerp: 0.075,
      duration: 1.25,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.9,
      overscroll: false,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [enabled, reduceMotion]);

  return children;
}
