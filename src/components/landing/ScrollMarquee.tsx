"use client";

import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from "motion/react";

import { SCROLL_SPRING_MARQUEE, SCROLL_SPRING_SECTION, useScrollProgressMotion } from "@/lib/motion/scroll-motion";

export type ScrollMarqueeVariant = "outline" | "ghost" | "solid" | "accent";

/** Always-on drift speed (px per ms) */
const MARQUEE_BASE_SPEED = 0.022;
/** Max extra speed from scroll (px per ms) */
const MARQUEE_SCROLL_BOOST = 0.16;

const MARQUEE_SCROLL_OFFSET: ["start 1.4", "end -0.4"] = ["start 1.4", "end -0.4"];

type ScrollMarqueeProps = {
  segments: readonly string[] | string[];
  separator?: string;
  direction?: "left" | "right";
  variant?: ScrollMarqueeVariant;
  repeats?: number;
  className?: string;
  dark?: boolean;
  ariaHidden?: boolean;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function variantClass(variant: ScrollMarqueeVariant, dark: boolean) {
  switch (variant) {
    case "outline":
      return dark
        ? "text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.22)]"
        : "text-transparent [-webkit-text-stroke:1.5px_rgba(21,21,21,0.15)]";
    case "accent":
      return "text-[var(--accent)]/35";
    case "solid":
      return dark ? "text-white/90" : "text-[var(--ink)]";
    default:
      return dark ? "text-white/[0.07]" : "text-[var(--ink)]/[0.06]";
  }
}

function useMarqueeDrift(
  direction: "left" | "right",
  containerRef: RefObject<HTMLElement | null>,
  trackRef: RefObject<HTMLDivElement | null>,
) {
  const reduceMotion = useReducedMotion();
  const drift = useMotionValue(0);
  const loopWidthRef = useRef(0);

  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, SCROLL_SPRING_MARQUEE);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: MARQUEE_SCROLL_OFFSET,
  });

  const visibility = useTransform(scrollYProgress, (p) => {
    const t = Math.min(1, Math.max(0, p));
    return Math.sin(t * Math.PI);
  });

  const rawBoost = useTransform([smoothVelocity, visibility], ([velocity, vis]) => {
    const speedFactor = Math.min(Math.abs(velocity as number) / 900, 1);
    return speedFactor * (vis as number);
  });
  const scrollBoost = useSpring(rawBoost, SCROLL_SPRING_MARQUEE);

  const measureLoop = () => {
    const track = trackRef.current;
    if (!track) return 0;

    const half = track.offsetWidth / 2;
    if (half <= 0) return 0;

    const prev = loopWidthRef.current;
    loopWidthRef.current = half;

    if (prev === 0) {
      drift.set(direction === "right" ? -half : 0);
    } else {
      const current = drift.get();
      if (direction === "right" && current >= 0) {
        drift.set(-half);
      } else if (currentOutOfRange(current, half, direction)) {
        drift.set(wrapPosition(current, half, direction));
      }
    }

    return half;
  };

  useLayoutEffect(() => {
    measureLoop();
    const track = trackRef.current;
    if (!track) return;

    const observer = new ResizeObserver(() => {
      measureLoop();
    });
    observer.observe(track);
    return () => observer.disconnect();
  });

  useAnimationFrame((_, delta) => {
    if (reduceMotion) return;

    const loopWidth = loopWidthRef.current || measureLoop();
    if (loopWidth <= 0) return;

    const speed = MARQUEE_BASE_SPEED + scrollBoost.get() * MARQUEE_SCROLL_BOOST;
    const current = drift.get();

    if (direction === "right") {
      let next = current + speed * delta;
      while (next >= 0) next -= loopWidth;
      drift.set(next);
      return;
    }

    let next = current - speed * delta;
    while (next <= -loopWidth) next += loopWidth;
    drift.set(next);
  });

  return drift;
}

function currentOutOfRange(value: number, loopWidth: number, direction: "left" | "right") {
  if (direction === "right") return value >= 0 || value < -loopWidth;
  return value <= -loopWidth || value > 0;
}

function wrapPosition(value: number, loopWidth: number, direction: "left" | "right") {
  if (direction === "right") {
    let next = value;
    while (next >= 0) next -= loopWidth;
    while (next < -loopWidth) next += loopWidth;
    return next;
  }

  let next = value;
  while (next <= -loopWidth) next += loopWidth;
  while (next > 0) next -= loopWidth;
  return next;
}

function MarqueeTrack({
  segments,
  separator,
  repeats,
  variant,
  dark,
  x,
  trackRef,
}: {
  segments: readonly string[] | string[];
  separator: string;
  repeats: number;
  variant: ScrollMarqueeVariant;
  dark: boolean;
  x: MotionValue<number>;
  trackRef: RefObject<HTMLDivElement | null>;
}) {
  const phrase = (
    <>
      {segments.map((segment, j) => (
        <span key={segment} className="inline-flex items-center">
          <span>{segment}</span>
          {j < segments.length - 1 ? (
            <span className="mx-[0.35em] opacity-50" aria-hidden>
              {separator.trim()}
            </span>
          ) : null}
        </span>
      ))}
      <span className="mx-[0.5em] opacity-40" aria-hidden>
        {separator.trim()}
      </span>
    </>
  );

  return (
    <motion.div
      ref={trackRef}
      className={cn("type-marquee flex w-max whitespace-nowrap", variantClass(variant, dark))}
      style={{ x }}
      aria-hidden
    >
      {Array.from({ length: repeats }, (_, i) => (
        <span key={i} className="inline-flex shrink-0 items-center">
          {phrase}
        </span>
      ))}
    </motion.div>
  );
}

/** Outline text that always drifts slowly, accelerating smoothly while the page scrolls. */
export function ScrollMarquee({
  segments,
  separator = " • ",
  direction = "left",
  variant = "outline",
  repeats = 4,
  className,
  dark = false,
  ariaHidden = true,
}: ScrollMarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const x = useMarqueeDrift(direction, containerRef, trackRef);

  if (reduceMotion) {
    return (
      <div
        ref={containerRef}
        className={cn("overflow-hidden py-3 md:py-4", className)}
        aria-hidden={ariaHidden}
      >
        <div className={cn("type-marquee truncate whitespace-nowrap", variantClass(variant, dark))}>
          {segments.join(separator)}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("overflow-hidden py-3 md:py-5", className)} aria-hidden={ariaHidden}>
      <MarqueeTrack
        segments={segments}
        separator={separator}
        repeats={repeats}
        variant={variant}
        dark={dark}
        x={x}
        trackRef={trackRef}
      />
    </div>
  );
}

type ScrollMarqueeRow = {
  segments: readonly string[] | string[];
  direction?: "left" | "right";
  variant?: ScrollMarqueeVariant;
};

type ScrollMarqueeBandProps = {
  rows: readonly ScrollMarqueeRow[];
  className?: string;
  dark?: boolean;
};

export function ScrollMarqueeBand({ rows, className, dark = false }: ScrollMarqueeBandProps) {
  return (
    <div className={cn("flex flex-col gap-1 md:gap-2", className)}>
      {rows.map((row, index) => (
        <ScrollMarquee
          key={index}
          segments={row.segments}
          direction={row.direction ?? (index % 2 === 0 ? "right" : "left")}
          variant={row.variant ?? "outline"}
          dark={dark}
        />
      ))}
    </div>
  );
}

export function ScrollMarqueeDivider({
  children,
  className,
  dark,
  fade = false,
  edge = "both",
}: {
  children?: ReactNode;
  className?: string;
  dark?: boolean;
  /** Scroll-linked fade in/out at section boundaries */
  fade?: boolean;
  /** Which edges get a divider line */
  edge?: "both" | "top" | "bottom";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const motionProgress = useScrollProgressMotion(scrollYProgress, SCROLL_SPRING_SECTION);
  const opacity = useTransform(motionProgress, [0, 0.18, 0.82, 1], [0.35, 1, 1, 0.35]);

  const edgeClass =
    edge === "top" ? "border-t" : edge === "bottom" ? "border-b" : "border-y";

  return (
    <motion.div
      ref={ref}
      className={cn(
        edgeClass,
        dark ? "border-white/10 bg-black" : "border-[var(--line)] bg-[var(--tone)]/50",
        className,
      )}
      style={fade && !reduceMotion ? { opacity } : undefined}
    >
      {children}
    </motion.div>
  );
}
