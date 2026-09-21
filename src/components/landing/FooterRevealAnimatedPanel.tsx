"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

import { Footer } from "@/components/landing/Footer";
import { HOME_SIGNUP_SECTION_ID } from "@/lib/marketing/scroll-to-signup";
import { SCROLL_SPRING_SECTION, useScrollProgressMotion } from "@/lib/motion/scroll-motion";

/**
 * Signup band + footer.
 *
 * `plain` keeps the long-standing bottom-anchored footer used by pages without
 * a signup band. With a band, the normal-flow `static` layout is the baseline —
 * it is what renders on the server, under reduced motion, and any time the
 * panel cannot fit one screen (short windows, text zoom, growing content). The
 * fixed `animated` reveal is layered on only after we measure that it fits, so
 * conversion and footer navigation are never reveal-dependent.
 */
type RevealMode = "plain" | "static" | "animated";

export function FooterRevealAnimatedPanel({ footerBand }: { footerBand?: ReactNode }) {
  const spacerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const hasBand = Boolean(footerBand);

  const [canAnimate, setCanAnimate] = useState(false);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);

  const measure = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;

    // Measured against the natural (static) height: `animated` adds only a
    // min-height, never a cap, so this stays a truthful fit check.
    const natural = panel.scrollHeight;
    setPanelHeight(natural);
    setCanAnimate(natural <= window.innerHeight);
  }, []);

  const revealEligible = hasBand && !reduceMotion;

  useEffect(() => {
    if (!revealEligible) return;

    const panel = panelRef.current;
    if (!panel) return;

    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => measure()) : null;
    if (observer) {
      observer.observe(panel);
    } else {
      measure();
    }
    window.addEventListener("resize", measure);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, revealEligible]);

  const mode: RevealMode = !hasBand
    ? "plain"
    : revealEligible && canAnimate
      ? "animated"
      : "static";

  const { scrollYProgress } = useScroll({
    target: spacerRef,
    offset: ["start end", "end end"],
  });
  const motionProgress = useScrollProgressMotion(scrollYProgress, SCROLL_SPRING_SECTION);
  const opacity = useTransform(motionProgress, [0, 0.12, 0.22, 0.62, 1], [0, 0, 0.35, 0.9, 1]);
  const y = useTransform(motionProgress, [0, 0.35, 1], [28, 10, 0]);
  const visibility = useTransform(opacity, (value) => (value > 0.01 ? "visible" : "hidden"));
  const pointerEvents = useTransform(opacity, (value) => (value > 0.01 ? "auto" : "none"));

  return (
    <>
      <div
        ref={spacerRef}
        className="marketing-footer-reveal__spacer"
        data-footer-reveal={mode}
        id={hasBand ? HOME_SIGNUP_SECTION_ID : undefined}
        style={
          mode === "animated" && panelHeight
            ? { height: `${panelHeight}px` }
            : undefined
        }
        aria-hidden
      />
      <motion.div
        ref={panelRef}
        className="marketing-footer-reveal__footer"
        data-footer-reveal={mode}
        style={mode === "animated" ? { opacity, y, visibility, pointerEvents } : undefined}
      >
        {footerBand ? <div className="marketing-footer-reveal__band">{footerBand}</div> : null}
        <Footer bare={hasBand} reveal={hasBand} />
      </motion.div>
    </>
  );
}
