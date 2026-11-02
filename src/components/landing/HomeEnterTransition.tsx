"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

type HomeEnterPhase = "enter" | "idle";

export function HomeEnterTransition({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<HomeEnterPhase>(() => {
    if (typeof window === "undefined") return "idle";
    try { return sessionStorage.getItem("auth-split-home-enter") ? "enter" : "idle"; } catch { return "idle"; }
  });

  useEffect(() => {
    if (phase !== "enter" || reduceMotion) {
      try { sessionStorage.removeItem("auth-split-home-enter"); } catch { /* Storage is optional for this transition. */ }

      return;
    }

    try { sessionStorage.removeItem("auth-split-home-enter"); } catch { /* Storage is optional for this transition. */ }
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase("idle"));
    });
    return () => cancelAnimationFrame(frame);
  }, [phase, reduceMotion]);

  return <div className={`home-enter-transition home-enter-transition--${reduceMotion ? "idle" : phase}`}>{children}</div>;
}
