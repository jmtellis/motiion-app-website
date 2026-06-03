"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

import { useScrollSceneProgress } from "@/components/landing/ScrollScene";
import { useSectionScrollProgress } from "@/components/landing/SectionTransition";
import { useScrollProgressMotion } from "@/lib/motion/scroll-motion";

type LineDriftProps = {
  className?: string;
  /** Horizontal travel multiplier */
  speed?: number;
  children?: ReactNode;
};

/** Horizontal tape lines that drift with scroll progress. */
export function LineDrift({ className, speed = 1, children }: LineDriftProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const sceneProgress = useScrollSceneProgress();
  const sectionProgress = useSectionScrollProgress();

  const { scrollYProgress: localProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const rawProgress = sceneProgress ?? sectionProgress ?? localProgress;
  const isPreSmoothed = Boolean(sceneProgress ?? sectionProgress);
  const smoothedProgress = useScrollProgressMotion(rawProgress);
  const progress = isPreSmoothed ? rawProgress : smoothedProgress;
  const travel = 48 * speed;
  const x = useTransform(progress, [0, 1], [-travel, travel]);
  const xReverse = useTransform(progress, [0, 1], [travel * 0.6, -travel * 0.6]);

  if (reduceMotion) {
    return (
      <div ref={ref} className={className} aria-hidden>
        {children ?? <DefaultLines />}
      </div>
    );
  }

  return (
    <div ref={ref} className={className} aria-hidden>
      <motion.div className="absolute inset-0" style={{ x }}>
        {children ?? <DefaultLines variant="primary" />}
      </motion.div>
      <motion.div className="absolute inset-0 opacity-60" style={{ x: xReverse }}>
        <DefaultLines variant="secondary" />
      </motion.div>
    </div>
  );
}

function DefaultLines({ variant = "primary" }: { variant?: "primary" | "secondary" }) {
  const color = variant === "primary" ? "rgba(0, 204, 183, 0.12)" : "rgba(255, 255, 255, 0.06)";
  return (
    <svg className="h-full w-[120%] -translate-x-[10%]" preserveAspectRatio="none" viewBox="0 0 1200 800">
      {[120, 280, 440, 600, 760].map((y) => (
        <line
          key={`${variant}-${y}`}
          x1="0"
          y1={y}
          x2="1200"
          y2={y}
          stroke={color}
          strokeWidth="1"
          strokeDasharray={variant === "primary" ? "8 12" : "4 16"}
        />
      ))}
      <line x1="200" y1="0" x2="200" y2="800" stroke={color} strokeWidth="1" strokeDasharray="6 10" />
      <line x1="600" y1="0" x2="600" y2="800" stroke={color} strokeWidth="1" strokeDasharray="6 10" />
      <line x1="1000" y1="0" x2="1000" y2="800" stroke={color} strokeWidth="1" strokeDasharray="6 10" />
    </svg>
  );
}
