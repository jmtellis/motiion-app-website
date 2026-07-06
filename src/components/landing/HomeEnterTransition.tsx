"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

type HomeEnterPhase = "enter" | "idle";

export function HomeEnterTransition({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<HomeEnterPhase>(() => {
    if (typeof window === "undefined") return "idle";
    return sessionStorage.getItem("auth-split-home-enter") ? "enter" : "idle";
  });

  useEffect(() => {
    if (phase !== "enter" || reduceMotion) {
      sessionStorage.removeItem("auth-split-home-enter");
      if (phase === "enter" && reduceMotion) {
        setPhase("idle");
      }
      return;
    }

    sessionStorage.removeItem("auth-split-home-enter");
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase("idle"));
    });
    return () => cancelAnimationFrame(frame);
  }, [phase, reduceMotion]);

  return <div className={`home-enter-transition home-enter-transition--${phase}`}>{children}</div>;
}
