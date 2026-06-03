"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

import { HeroScrollDepth } from "@/components/landing/HeroScrollDepth";
import { MARKETING_DARK } from "@/lib/marketing/dark-theme";
import { useScrollProgressMotion } from "@/lib/motion/scroll-motion";

type HomeHeroSectionProps = {
  headerPullClass: string;
  background: ReactNode;
  children: ReactNode;
};

/** Hero with scroll-linked headshot fade and bottom scrim into the first pillar. */
export function HomeHeroSection({ headerPullClass, background, children }: HomeHeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const motionProgress = useScrollProgressMotion(scrollYProgress);

  const headshotOpacity = useTransform(motionProgress, [0, 0.55, 1], [1, 0.45, 0]);
  const scrimOpacity = useTransform(motionProgress, [0.35, 1], [0.35, 1]);
  const heroScale = useTransform(motionProgress, [0, 1], [1, 0.92]);
  const heroY = useTransform(motionProgress, [0, 1], [0, -48]);

  return (
    <section
      ref={sectionRef}
      className={`relative min-h-svh w-full overflow-hidden ${headerPullClass}`}
    >
      {reduceMotion ? (
        <div className="absolute inset-0" aria-hidden>
          {background}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, transparent 45%, ${MARKETING_DARK.bg} 100%)`,
            }}
          />
        </div>
      ) : (
        <>
          <motion.div className="absolute inset-0" style={{ opacity: headshotOpacity }} aria-hidden>
            {background}
          </motion.div>
          <motion.div
            className="pointer-events-none absolute inset-0"
            style={{ opacity: scrimOpacity }}
            aria-hidden
          >
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.35) 50%, ${MARKETING_DARK.bg} 92%)`,
              }}
            />
          </motion.div>
        </>
      )}

      <HeroScrollDepth background={null} scrollProgress={reduceMotion ? undefined : motionProgress}>
        <motion.div
          className="relative z-[2] flex min-h-svh w-full items-center justify-center px-0 pb-12 pt-20 md:pt-24"
          style={reduceMotion ? undefined : { scale: heroScale, y: heroY }}
        >
          {children}
        </motion.div>
      </HeroScrollDepth>
      <div id="home-hero-end" className="pointer-events-none absolute bottom-0 left-0 h-px w-full" aria-hidden />
    </section>
  );
}
