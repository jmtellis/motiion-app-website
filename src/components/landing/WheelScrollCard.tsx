"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";

import { EditorialHeadline } from "@/components/landing/EditorialHeadline";
import type { EditorialPart } from "@/lib/marketing/homepage-content";

type WheelScrollCardProps = {
  id: string;
  titleParts: EditorialPart[];
  description: string;
  image: { src: string; alt: string; kind?: "image" | "video"; poster?: string };
  dark?: boolean;
  headshotStack?: ReactNode;
};

function WheelCardStage({
  image,
  headshotStack,
}: {
  image: WheelScrollCardProps["image"];
  headshotStack?: ReactNode;
}) {
  if (headshotStack) {
    return headshotStack;
  }

  if (image.kind === "video") {
    return (
      <video
        src={image.src}
        poster={image.poster}
        autoPlay
        loop
        muted
        playsInline
        aria-label={image.alt}
        className="h-auto max-h-[min(48svh,28rem)] w-auto max-w-[min(42vw,14rem)] object-contain sm:max-w-[17rem]"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.src}
      alt={image.alt}
      className="max-h-[min(46svh,26rem)] w-full max-w-4xl rounded-2xl object-cover object-center"
    />
  );
}

function WheelCardPanel({
  titleParts,
  description,
  image,
  dark,
  headshotStack,
}: Pick<
  WheelScrollCardProps,
  "titleParts" | "description" | "image" | "dark" | "headshotStack"
>) {
  const copyBlock = (
    <>
      <EditorialHeadline
        parts={titleParts}
        as="h2"
        size="heading-1"
        dark={dark}
        className="!text-[clamp(1.5rem,2.6vw,2rem)] !leading-[1.12] !tracking-[-0.025em]"
      />
      <p
        className={`mt-3 text-pretty text-sm leading-relaxed sm:text-[0.9375rem] ${
          dark ? "text-white/62" : "text-[var(--ink-soft)]"
        }`}
      >
        {description}
      </p>
    </>
  );

  return (
    <div
      className={`ui-wheel-card relative w-full overflow-hidden ${
        headshotStack ? "ui-wheel-card--split" : ""
      } ${dark ? "text-white" : "text-[var(--ink)]"}`}
    >
      <div className="ui-wheel-card__glow pointer-events-none absolute inset-0" aria-hidden />

      {headshotStack ? (
        <div className="ui-wheel-card__split relative z-10">
          <div className="ui-wheel-card__split-copy">{copyBlock}</div>
          <div className="ui-wheel-card__split-media">{headshotStack}</div>
        </div>
      ) : (
        <div className="relative z-10 flex h-full min-h-[inherit] flex-col">
          <div className="shrink-0 px-7 pb-4 pt-7 sm:px-9 sm:pt-9 lg:px-11 lg:pt-10">
            <div className="max-w-md text-left">{copyBlock}</div>
          </div>

          <div className="ui-wheel-card__stage relative flex flex-1 items-end justify-center px-5 pb-7 sm:px-8 sm:pb-9 lg:pb-10">
            <WheelCardStage image={image} headshotStack={headshotStack} />
          </div>
        </div>
      )}
    </div>
  );
}

export function WheelScrollCard({
  id,
  titleParts,
  description,
  image,
  dark = true,
  headshotStack,
}: WheelScrollCardProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress: exitProgress } = useScroll({
    target: sectionRef,
    offset: ["start 80px", "end 80px"],
  });

  const blurPx = useTransform(exitProgress, [0, 0.72, 1], [0, 6, 10]);
  const filter = useMotionTemplate`blur(${blurPx}px)`;
  const scale = useTransform(exitProgress, [0, 0.75, 1], [1, 1, 0.97]);
  const opacity = useTransform(exitProgress, [0, 0.85, 1], [1, 1, 0.78]);

  const cardLabel = titleParts.map((part) => (typeof part === "string" ? part : part.text)).join("");

  if (reduceMotion) {
    return (
      <section id={id} className="ui-wheel-scene--static px-4 py-8 sm:px-6">
        <WheelCardPanel
          titleParts={titleParts}
          description={description}
          image={image}
          dark={dark}
          headshotStack={headshotStack}
        />
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id={id}
      className="ui-wheel-scene px-4 sm:px-6 lg:px-10"
      aria-label={cardLabel}
    >
      <motion.div
        className="ui-wheel-scene__card-wrap mx-auto w-full max-w-[88rem]"
        style={{ scale, opacity, filter }}
      >
        <WheelCardPanel
          titleParts={titleParts}
          description={description}
          image={image}
          dark={dark}
          headshotStack={headshotStack}
        />
      </motion.div>
    </section>
  );
}
