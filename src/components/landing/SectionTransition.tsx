"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";

import { LineDrift } from "@/components/landing/LineDrift";
import { ScrollScene } from "@/components/landing/ScrollScene";
import { SCROLL_SPRING_SECTION, useScrollProgressMotion } from "@/lib/motion/scroll-motion";

export type SectionTransitionVariant =
  | "rise"
  | "parallax"
  | "editorial-slide"
  | "focus"
  | "pinned-scene"
  | "line-drift";

const SectionScrollContext = createContext<MotionValue<number> | null>(null);

export function useSectionScrollProgress() {
  return useContext(SectionScrollContext);
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type SectionTransitionProps = {
  id?: string;
  variant?: SectionTransitionVariant;
  className?: string;
  /** For pinned-scene: outer scroll height */
  sceneHeight?: string;
  children: ReactNode;
};

function SectionTransitionBody({
  variant,
  children,
  progress,
}: {
  variant: SectionTransitionVariant;
  children: ReactNode;
  progress: MotionValue<number>;
}) {
  const riseY = useTransform(progress, [0, 0.34, 0.66, 1], [64, 0, 0, -32]);
  const riseOpacity = useTransform(progress, [0, 0.2, 0.8, 1], [0.15, 1, 1, 0.82]);

  const slideX = useTransform(progress, [0.1, 0.38], ["5%", "0%"]);
  const slideOpacity = useTransform(progress, [0.1, 0.32], [0.88, 1]);

  const focusScale = useTransform(progress, [0, 0.32, 0.68, 1], [0.93, 1, 1, 0.96]);
  const focusOpacity = useTransform(progress, [0, 0.18, 0.82, 1], [0.35, 1, 1, 0.72]);
  const focusY = useTransform(progress, [0, 0.35, 0.65, 1], [40, 0, 0, -20]);

  const driftOpacity = useTransform(progress, [0, 0.22, 0.78, 1], [0.2, 1, 1, 0.8]);

  switch (variant) {
    case "editorial-slide":
      return (
        <motion.div className="relative z-[1]" style={{ x: slideX, opacity: slideOpacity }}>
          {children}
        </motion.div>
      );
    case "focus":
      return (
        <motion.div
          className="relative z-[1]"
          style={{ scale: focusScale, opacity: focusOpacity, y: focusY }}
        >
          {children}
        </motion.div>
      );
    case "line-drift":
      return (
        <>
          <LineDrift className="pointer-events-none absolute inset-0 overflow-hidden opacity-60" speed={1.1} />
          <motion.div
            className="relative z-[1] flex min-h-[inherit] w-full flex-col justify-center"
            style={{ opacity: driftOpacity }}
          >
            {children}
          </motion.div>
        </>
      );
    case "parallax":
    case "rise":
    default:
      return (
        <motion.div className="relative z-[1]" style={{ y: riseY, opacity: riseOpacity }}>
          {children}
        </motion.div>
      );
  }
}

/**
 * Per-section scroll character — each variant is intentionally different.
 */
export function SectionTransition({
  id,
  variant = "rise",
  className,
  sceneHeight,
  children,
}: SectionTransitionProps) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const motionProgress = useScrollProgressMotion(scrollYProgress, SCROLL_SPRING_SECTION);

  if (variant === "pinned-scene") {
    return (
      <ScrollScene id={id} className={className} sceneHeight={sceneHeight ?? "min-h-[200svh]"}>
        {children}
      </ScrollScene>
    );
  }

  if (reduceMotion) {
    return (
      <section id={id} className={cn("relative overflow-hidden", className)}>
        {children}
      </section>
    );
  }

  return (
    <section ref={ref} id={id} className={cn("relative overflow-hidden", className)}>
      <SectionScrollContext.Provider value={motionProgress}>
        <SectionTransitionBody variant={variant} progress={motionProgress}>
          {children}
        </SectionTransitionBody>
      </SectionScrollContext.Provider>
    </section>
  );
}

type SectionParallaxProps = {
  children: ReactNode;
  className?: string;
  /** Higher = more vertical travel while the section crosses the viewport */
  speed?: number;
  /** Invert travel direction for split-depth layers */
  invert?: boolean;
};

/** Split-depth layer — text and media drift at different rates (parallax sections). */
export function SectionParallax({
  children,
  className,
  speed = 1,
  invert = false,
}: SectionParallaxProps) {
  const progress = useSectionScrollProgress();
  const reduceMotion = useReducedMotion();
  const travel = 42 * speed * (invert ? -1 : 1);
  const y = useTransform(progress ?? staticProgress, [0, 1], [travel, -travel]);

  if (reduceMotion || !progress) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} style={{ y }}>
      {children}
    </motion.div>
  );
}

const staticProgress = { get: () => 0.5 } as never;
