"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

import { EditorialHeadline } from "@/components/landing/EditorialHeadline";
import { Reveal } from "@/components/landing/Reveal";
import { SectionMediaPlaceholder } from "@/components/landing/SectionMediaPlaceholder";
import type { EditorialPart } from "@/lib/marketing/homepage-content";
import { useScrollProgressMotion } from "@/lib/motion/scroll-motion";

type FeatureNarrativeSectionProps = {
  id: string;
  index: number;
  titleParts: EditorialPart[];
  description: string;
  image: { src: string; alt: string; kind?: "image" | "video"; poster?: string };
  dark?: boolean;
  headshotStack?: ReactNode;
};

export function FeatureNarrativeSection({
  id,
  index,
  titleParts,
  description,
  image,
  dark = true,
  headshotStack,
}: FeatureNarrativeSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const mediaFirst = index % 2 === 1;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const motionProgress = useScrollProgressMotion(scrollYProgress);
  const mediaY = useTransform(motionProgress, [0, 1], [24, -24]);
  const mediaOpacity = useTransform(motionProgress, [0, 0.2, 0.8, 1], [0.72, 1, 1, 0.72]);

  const textBlock = (
    <Reveal amount={0.2} distance={18}>
      <EditorialHeadline parts={titleParts} as="h2" size="heading-1" dark={dark} />
      <p
        className={`type-lead mt-5 max-w-xl text-pretty ${dark ? "text-on-dark-secondary" : "text-[var(--ink-soft)]"}`}
      >
        {description}
      </p>
    </Reveal>
  );

  const mediaBlock = (
    <Reveal delay={0.05} amount={0.18} distance={20}>
      {headshotStack ?? (
        <SectionMediaPlaceholder
          src={image.src}
          alt={image.alt}
          kind={image.kind}
          poster={image.poster}
          dark={dark}
          aspect={image.kind === "video" ? "portrait" : "wide"}
          motion="parallax"
          className={
            image.kind === "video" ? "mx-auto max-w-[14rem] sm:max-w-[16rem] lg:max-w-[18rem]" : undefined
          }
        />
      )}
    </Reveal>
  );

  return (
    <section
      id={id}
      ref={sectionRef}
      className={`ui-section-narrative border-t ${dark ? "border-[#262626] bg-[var(--stage-black)]" : "border-[var(--line)] bg-[var(--paper)]"}`}
    >
      <div
        className={`ui-split-scroll ui-split-scroll--sticky-left ${mediaFirst ? "[&>*:first-child]:lg:order-2 [&>*:last-child]:lg:order-1" : ""}`}
      >
        <div className="ui-sticky-feature">{textBlock}</div>
        {reduceMotion ? (
          <div>{mediaBlock}</div>
        ) : (
          <motion.div style={{ y: mediaY, opacity: mediaOpacity }}>{mediaBlock}</motion.div>
        )}
      </div>
    </section>
  );
}
