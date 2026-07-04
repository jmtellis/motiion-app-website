"use client";

import { motion, useReducedMotion, useTransform, type MotionValue } from "motion/react";

import { RevealStagger } from "@/components/landing/RevealStagger";
import {
  SectionTransition,
  useSectionScrollProgress,
} from "@/components/landing/SectionTransition";

type ProductScreen = {
  src: string;
  alt: string;
  label: string;
};

type ProductProofStripProps = {
  eyebrow: string;
  title: string;
  screens: ProductScreen[];
  dark?: boolean;
  /** Light marketing pages: grey band instead of white. */
  toneBackground?: boolean;
};

function ProductScreenCard({
  screen,
  dark,
  cardIndex,
  progress,
}: {
  screen: ProductScreen;
  dark: boolean;
  cardIndex: number;
  progress: MotionValue<number>;
}) {
  const offsets = [-22, 0, 22];
  const spread = useTransform(progress, [0.28, 0.52, 0.72], [0.85, 0, -0.35]);
  const cardX = useTransform(spread, (v) => v * offsets[cardIndex]);
  const cardY = useTransform(progress, [0.28, 0.52], [cardIndex === 1 ? 20 : 32, 0]);

  const frameClass = dark
    ? "border-white/12 bg-white/[0.03]"
    : "border-[var(--line)] bg-[var(--tone)]";

  return (
    <motion.figure
      className={`overflow-hidden rounded-2xl border ${frameClass}`}
      style={{ x: cardX, y: cardY }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={screen.src} alt={screen.alt} className="aspect-[9/16] w-full object-cover object-top" />
      <figcaption className={`type-caption px-4 py-3 ${dark ? "text-on-dark-secondary" : "text-[var(--ink-soft)]"}`}>
        {screen.label}
      </figcaption>
    </motion.figure>
  );
}

function ProductScreenCardStatic({ screen, dark }: { screen: ProductScreen; dark: boolean }) {
  const frameClass = dark
    ? "border-white/12 bg-white/[0.03]"
    : "border-[var(--line)] bg-[var(--tone)]";

  return (
    <figure className={`overflow-hidden rounded-2xl border ${frameClass}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={screen.src} alt={screen.alt} className="aspect-[9/16] w-full object-cover object-top" />
      <figcaption className={`type-caption px-4 py-3 ${dark ? "text-on-dark-secondary" : "text-[var(--ink-soft)]"}`}>
        {screen.label}
      </figcaption>
    </figure>
  );
}

function ProductCards({ screens, dark }: { screens: ProductScreen[]; dark: boolean }) {
  const progress = useSectionScrollProgress();
  const reduceMotion = useReducedMotion();

  if (reduceMotion || !progress) {
    return (
      <div className="mt-12 grid gap-4 sm:grid-cols-3 sm:gap-5">
        {screens.map((screen) => (
          <ProductScreenCardStatic key={screen.label} screen={screen} dark={dark} />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-12 grid gap-4 sm:grid-cols-3 sm:gap-5">
      {screens.map((screen, index) => (
        <ProductScreenCard
          key={screen.label}
          screen={screen}
          dark={dark}
          cardIndex={index}
          progress={progress}
        />
      ))}
    </div>
  );
}

/** Signature section — restrained horizontal slide + card spread on scroll. */
export function ProductProofStrip({
  eyebrow,
  title,
  screens,
  dark = false,
  toneBackground = false,
}: ProductProofStripProps) {
  const lightBg = toneBackground ? "bg-[var(--tone)]" : "bg-[var(--paper)]";

  return (
    <SectionTransition
      id="product"
      variant="editorial-slide"
      className={`overflow-hidden border-t px-6 py-16 sm:px-10 sm:py-20 ${
        dark ? "border-[#262626] bg-[#0a0a0a]/80 backdrop-blur-[2px]" : `border-[var(--line)] ${lightBg}`
      }`}
    >
      <div className="mx-auto w-full max-w-6xl">
        <RevealStagger amount={0.2} distance={18} className="mx-auto max-w-2xl text-center">
          <p className="type-eyebrow text-[var(--accent)]">{eyebrow}</p>
          <h2 className={`type-heading-1 mt-4 text-balance ${dark ? "text-on-dark-primary" : "text-[var(--ink)]"}`}>
            {title}
          </h2>
        </RevealStagger>

        <ProductCards screens={screens} dark={dark} />
      </div>
    </SectionTransition>
  );
}
