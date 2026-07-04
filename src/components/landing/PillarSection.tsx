"use client";

import { EditorialHeadline } from "@/components/landing/EditorialHeadline";
import { HeadshotCardStack } from "@/components/landing/HeadshotCardStack";
import { Reveal } from "@/components/landing/Reveal";
import {
  SectionParallax,
  SectionTransition,
  type SectionTransitionVariant,
} from "@/components/landing/SectionTransition";
import { ScrollMarquee, ScrollMarqueeDivider } from "@/components/landing/ScrollMarquee";
import { SectionMediaPlaceholder } from "@/components/landing/SectionMediaPlaceholder";
import type { EditorialPart } from "@/lib/marketing/homepage-content";

type PillarMarquee = {
  segments: readonly string[];
  direction: "left" | "right";
};

type Pillar = {
  title: string;
  titleParts?: EditorialPart[];
  description: string;
  image: { src: string; alt: string; kind?: "image" | "video"; poster?: string };
};

export type PillarSurface = "dark" | "tone" | "paper";

type PillarSectionProps = {
  pillar: Pillar;
  index: number;
  dark?: boolean;
  /** Overrides index-based alternation (e.g. home landing mix). */
  surface?: PillarSurface;
  /** Optional Tailwind background class override. */
  backgroundClass?: string;
  /** Pillar 1: motion.dev-style swipeable headshot stack (max 10). */
  headshotStack?: string[];
  /** Optional outline marquee band at the bottom of this full-height section. */
  marquee?: PillarMarquee;
};

const pillarVariants: SectionTransitionVariant[] = ["parallax", "focus", "parallax"];

export function PillarSection({
  pillar,
  index,
  dark = false,
  surface,
  backgroundClass,
  headshotStack,
  marquee,
}: PillarSectionProps) {
  const altBackground = index % 2 === 1;
  const mediaFirst = index % 2 === 1;
  const variant = pillarVariants[index] ?? "rise";

  const resolvedSurface: PillarSurface =
    surface ?? (dark ? "dark" : altBackground ? "tone" : "paper");

  const bgClass =
    backgroundClass ??
    (resolvedSurface === "tone"
      ? "bg-[var(--tone)]"
      : resolvedSurface === "paper"
        ? "bg-[var(--paper)]"
        : surface
          ? "bg-[#0a0a0a]"
          : altBackground
            ? "bg-[#0a0a0a]"
            : "bg-[#0a0a0a]");

  const lightSurface = resolvedSurface === "tone" || resolvedSurface === "paper";

  const titleParts: EditorialPart[] =
    pillar.titleParts ?? [{ text: pillar.title, emphasis: true }];

  const mediaMotion = index === 1 ? "focus-scale" : "parallax";

  return (
    <SectionTransition
      id={`solution-${index + 1}`}
      variant={variant}
      className={`flex min-h-svh flex-col border-t ${
        lightSurface ? "border-[var(--line)]" : "border-[#262626]"
      } ${bgClass}`}
    >
      <div className="flex min-h-svh w-full flex-col justify-center px-6 py-12 sm:px-10 sm:py-16">
        <div
          className={`mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16 ${
            mediaFirst ? "[&>*:first-child]:lg:order-2 [&>*:last-child]:lg:order-1" : ""
          }`}
        >
        <SectionParallax
          speed={variant === "parallax" ? 0.75 : 0.45}
          invert={mediaFirst}
          className="mx-auto flex max-w-xl flex-col items-center text-center"
        >
          <Reveal amount={0.22} distance={20}>
            <EditorialHeadline
              parts={titleParts}
              as="h2"
              size="heading-1"
              dark={!lightSurface}
            />
            <p
              className={`type-lead mx-auto mt-6 max-w-xl text-pretty ${lightSurface ? "text-[var(--ink-soft)]" : "text-on-dark-secondary"}`}
            >
              {pillar.description}
            </p>
          </Reveal>
        </SectionParallax>

        <SectionParallax speed={variant === "parallax" ? 1.15 : 0.55} invert={!mediaFirst}>
          <Reveal delay={0.06} amount={0.22} distance={24}>
            {index === 0 && headshotStack && headshotStack.length > 0 ? (
              <HeadshotCardStack
                images={headshotStack}
                fallbackSrc={pillar.image.src}
                fallbackAlt={pillar.image.alt}
              />
            ) : (
              <SectionMediaPlaceholder
                src={pillar.image.src}
                alt={pillar.image.alt}
                kind={pillar.image.kind}
                poster={pillar.image.poster}
                dark={!lightSurface}
                aspect={index === 1 && pillar.image.kind !== "video" ? "portrait" : "wide"}
                motion={mediaMotion}
                className={
                  pillar.image.kind === "video"
                    ? "mx-auto max-w-[14rem] sm:max-w-[16rem] lg:max-w-[18rem]"
                    : undefined
                }
              />
            )}
          </Reveal>
        </SectionParallax>
        </div>
      </div>

      {marquee ? (
        <ScrollMarqueeDivider dark={!lightSurface} fade className="shrink-0">
          <ScrollMarquee
            segments={marquee.segments}
            direction={marquee.direction}
            variant="outline"
            dark={!lightSurface}
            className="py-2 md:py-4"
          />
        </ScrollMarqueeDivider>
      ) : null}
    </SectionTransition>
  );
}
