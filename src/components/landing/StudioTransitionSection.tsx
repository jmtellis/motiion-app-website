"use client";

import { motion, useReducedMotion, useTransform } from "motion/react";

import { EditorialHeadline } from "@/components/landing/EditorialHeadline";
import { LineDrift } from "@/components/landing/LineDrift";
import { ScrollScene, useScrollSceneProgress } from "@/components/landing/ScrollScene";
import {
  socialMetrics,
  studioTransitionSection,
  type StudioTransitionBeat,
} from "@/lib/marketing/homepage-content";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function StudioBeat({
  beat,
  dark,
  opacity,
  y,
}: {
  beat: StudioTransitionBeat;
  dark: boolean;
  opacity: ReturnType<typeof useTransform<number, number>>;
  y: ReturnType<typeof useTransform<number, number>>;
}) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center sm:px-10"
      style={{ opacity, y }}
    >
      <p className="type-eyebrow text-[var(--accent)]">{beat.eyebrow}</p>
      <EditorialHeadline
        parts={beat.headlineParts}
        as="h2"
        size="display-xl"
        dark={dark}
        className="mt-5 max-w-4xl"
      />
      <div
        className={cn(
          "relative mt-10 w-full max-w-3xl overflow-hidden rounded-2xl border",
          dark ? "border-white/10" : "border-[var(--line)]",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={beat.image.src}
          alt={beat.image.alt}
          className="aspect-[16/9] w-full object-cover"
          loading="lazy"
        />
      </div>
    </motion.div>
  );
}

function StudioSceneContent({ dark }: { dark: boolean }) {
  const progress = useScrollSceneProgress();
  const reduceMotion = useReducedMotion();
  const beats = studioTransitionSection.beats;

  const beatAOpacity = useTransform(progress ?? staticProgress, [0, 0.18, 0.44, 0.54], [1, 1, 0, 0]);
  const beatAY = useTransform(progress ?? staticProgress, [0, 0.5], [0, -52]);
  const beatBOpacity = useTransform(progress ?? staticProgress, [0.4, 0.5, 0.58, 1], [0, 1, 1, 1]);
  const beatBY = useTransform(progress ?? staticProgress, [0.4, 0.58], [56, 0]);
  const metricsOpacity = useTransform(progress ?? staticProgress, [0.52, 0.68], [0, 1]);

  if (reduceMotion || !progress) {
    return (
      <div className="relative mx-auto w-full max-w-6xl space-y-16 py-8">
        {beats.map((beat) => (
          <div key={beat.eyebrow} className="text-center">
            <p className="type-eyebrow text-[var(--accent)]">{beat.eyebrow}</p>
            <EditorialHeadline
              parts={beat.headlineParts}
              as="h2"
              size="display-xl"
              dark={dark}
              className="mx-auto mt-5 max-w-4xl"
            />
            <div
              className={cn(
                "relative mx-auto mt-10 w-full max-w-3xl overflow-hidden rounded-2xl border",
                dark ? "border-white/10" : "border-[var(--line)]",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={beat.image.src}
                alt={beat.image.alt}
                className="aspect-[16/9] w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        ))}
        <MetricChips dark={dark} />
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col justify-center">
      <LineDrift className="absolute inset-0 overflow-hidden opacity-70" speed={1.2} />
      <StudioBeat beat={beats[0]} dark={dark} opacity={beatAOpacity} y={beatAY} />
      <StudioBeat beat={beats[1]} dark={dark} opacity={beatBOpacity} y={beatBY} />
      <motion.div
        className="absolute right-0 bottom-[18%] left-0 z-[2] flex justify-center px-6"
        style={{ opacity: metricsOpacity }}
      >
        <MetricChips dark={dark} />
      </motion.div>
    </div>
  );
}

function MetricChips({ dark }: { dark: boolean }) {
  return (
    <ul className="flex flex-wrap justify-center gap-3 sm:gap-4">
      {socialMetrics.map((metric) => (
        <li
          key={metric.label}
          className={cn(
            "rounded-full border px-4 py-2 backdrop-blur-sm",
            dark ? "border-white/15 bg-white/5 text-on-dark-primary" : "border-[var(--line)] bg-white/80",
          )}
        >
          <span className="type-emphasis text-sm">{metric.value}</span>
          <span className={cn("type-caption ml-2", dark ? "text-on-dark-secondary" : "text-[var(--ink-soft)]")}>
            {metric.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

const staticProgress = { get: () => 0 } as never;

/** Signature pinned scene: behind the scenes → worldwide. */
export function StudioTransitionSection({ dark = false }: { dark?: boolean }) {
  return (
    <ScrollScene
      id="studio"
      sceneHeight="min-h-[180svh] md:min-h-[200svh]"
      className={cn(
        "border-t",
        dark ? "border-white/10 bg-black/75" : "border-[var(--line)] bg-[var(--tone)]",
      )}
    >
      <StudioSceneContent dark={dark} />
    </ScrollScene>
  );
}
