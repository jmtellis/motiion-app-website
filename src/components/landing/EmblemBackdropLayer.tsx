"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

import { useScrollProgressMotion } from "@/lib/motion/scroll-motion";

type EmblemBackdropLayerProps = {
  images: string[];
};

/** Full-page drifting imagery visible through header emblem cutout. */
export function EmblemBackdropLayer({ images }: EmblemBackdropLayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const motionProgress = useScrollProgressMotion(scrollYProgress);

  const y = useTransform(motionProgress, [0, 1], ["0%", "-25%"]);
  const opacity = useTransform(motionProgress, [0, 0.08, 0.2], [0.5, 0.7, 0.35]);

  const displayImages = images.slice(0, 6);
  if (displayImages.length === 0) return null;

  const grid = (
    <div className="grid h-[140vh] w-full grid-cols-3 gap-1 opacity-90">
      {displayImages.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${src}-${i}`}
          src={src}
          alt=""
          className="h-full w-full object-cover object-top"
          loading="lazy"
        />
      ))}
    </div>
  );

  if (reduceMotion) {
    return (
      <div ref={ref} className="pointer-events-none fixed inset-x-0 top-0 -z-[5] h-[50vh] overflow-hidden opacity-40" aria-hidden>
        {grid}
      </div>
    );
  }

  return (
    <div ref={ref} className="pointer-events-none fixed inset-x-0 top-0 -z-[5] h-[70vh] overflow-hidden" aria-hidden>
      <motion.div style={{ y, opacity }}>
        {grid}
      </motion.div>
    </div>
  );
}
