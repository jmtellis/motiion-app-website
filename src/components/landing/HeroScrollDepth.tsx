"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, useTransform, type MotionValue } from "motion/react";

type HeroScrollDepthProps = {
  background?: ReactNode | null;
  children: ReactNode;
  scrollProgress?: MotionValue<number>;
};

/** Subtle hero parallax on foreground copy (background handled separately when fading). */
export function HeroScrollDepth({ background, children, scrollProgress }: HeroScrollDepthProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion || !scrollProgress) {
    return (
      <>
        {background ? <div className="absolute inset-0" aria-hidden>{background}</div> : null}
        <div className="relative z-10">{children}</div>
      </>
    );
  }

  return (
    <HeroScrollDepthAnimated background={background} scrollProgress={scrollProgress}>
      {children}
    </HeroScrollDepthAnimated>
  );
}

function HeroScrollDepthAnimated({
  background,
  children,
  scrollProgress,
}: {
  background?: ReactNode | null;
  children: ReactNode;
  scrollProgress: MotionValue<number>;
}) {
  const backgroundY = useTransform(scrollProgress, [0, 1], [0, 90]);
  const contentY = useTransform(scrollProgress, [0, 1], [0, -36]);
  const contentOpacity = useTransform(scrollProgress, [0, 0.65], [1, 0.88]);

  return (
    <>
      {background ? (
        <motion.div className="absolute inset-0" style={{ y: backgroundY }} aria-hidden>
          {background}
        </motion.div>
      ) : null}
      <motion.div className="relative z-10" style={{ y: contentY, opacity: contentOpacity }}>
        {children}
      </motion.div>
    </>
  );
}
