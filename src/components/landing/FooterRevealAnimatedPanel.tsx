"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

import { Footer } from "@/components/landing/Footer";
import { HOME_SIGNUP_SECTION_ID } from "@/lib/marketing/scroll-to-signup";
import { SCROLL_SPRING_SECTION, useScrollProgressMotion } from "@/lib/motion/scroll-motion";

export function FooterRevealAnimatedPanel({ footerBand }: { footerBand?: ReactNode }) {
  const spacerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: spacerRef,
    offset: ["start end", "end end"],
  });
  const motionProgress = useScrollProgressMotion(scrollYProgress, SCROLL_SPRING_SECTION);
  const opacity = useTransform(motionProgress, [0, 0.22, 0.62, 1], [0, 0.35, 0.9, 1]);
  const y = useTransform(motionProgress, [0, 0.35, 1], [28, 10, 0]);

  const animateReveal = Boolean(footerBand) && !reduceMotion;

  return (
    <>
      <div
        ref={spacerRef}
        className="marketing-footer-reveal__spacer"
        id={footerBand ? HOME_SIGNUP_SECTION_ID : undefined}
        aria-hidden
      />
      <motion.div
        className="marketing-footer-reveal__footer"
        style={animateReveal ? { opacity, y } : undefined}
      >
        {footerBand ? <div className="marketing-footer-reveal__band">{footerBand}</div> : null}
        <Footer bare={Boolean(footerBand)} />
      </motion.div>
    </>
  );
}
