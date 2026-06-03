"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { useReducedMotion, useScroll, type MotionValue } from "motion/react";

import { useScrollProgressMotion } from "@/lib/motion/scroll-motion";

const ScrollSceneContext = createContext<MotionValue<number> | null>(null);

export function useScrollSceneProgress() {
  return useContext(ScrollSceneContext);
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ScrollSceneProps = {
  id?: string;
  className?: string;
  /** Outer wrapper height in viewport units (scroll distance while pinned). */
  sceneHeight?: string;
  /** Disable pin on small screens */
  disablePinOnMobile?: boolean;
  children: ReactNode;
};

/**
 * Pinned scroll scene — tall outer container, sticky inner stage.
 * Progress 0→1 maps to scrolling through the outer height.
 */
export function ScrollScene({
  id,
  className,
  sceneHeight = "min-h-[200svh]",
  disablePinOnMobile = true,
  children,
}: ScrollSceneProps) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const motionProgress = useScrollProgressMotion(scrollYProgress);

  if (reduceMotion) {
    return (
      <section id={id} className={cn("relative", className)}>
        <div className="flex min-h-svh flex-col justify-center px-6 py-16 sm:px-10">{children}</div>
      </section>
    );
  }

  const pinClass = disablePinOnMobile
    ? "md:sticky md:top-0 md:h-svh"
    : "sticky top-0 h-svh";

  return (
    <section ref={ref} id={id} className={cn("relative", sceneHeight, className)}>
      <ScrollSceneContext.Provider value={motionProgress}>
        <div className={cn("flex min-h-svh w-full items-center justify-center overflow-hidden", pinClass)}>
          {children}
        </div>
      </ScrollSceneContext.Provider>
    </section>
  );
}
