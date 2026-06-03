"use client";

import { motion, useReducedMotion, useTransform, type MotionValue } from "motion/react";

import { useSectionScrollProgress } from "@/components/landing/SectionTransition";

type SectionMediaPlaceholderProps = {
  src: string;
  alt: string;
  kind?: "image" | "video";
  poster?: string;
  /** Skip border, background, and gradient overlay — for transparent media. */
  frameless?: boolean;
  dark?: boolean;
  className?: string;
  aspect?: "wide" | "portrait";
  motion?: "enter" | "parallax" | "focus-scale";
};

function SectionMedia({
  src,
  alt,
  kind = "image",
  poster,
  autoPlay = true,
  frameless = false,
}: Pick<SectionMediaPlaceholderProps, "src" | "alt" | "kind" | "poster" | "frameless"> & {
  autoPlay?: boolean;
}) {
  const mediaClass = frameless
    ? "h-auto w-full max-w-full border-0 bg-transparent object-contain shadow-none outline-none ring-0"
    : "h-full w-full object-cover";

  if (kind === "video") {
    return (
      <video
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        loop
        muted
        playsInline
        aria-label={alt}
        className={mediaClass}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={mediaClass} />
  );
}

const aspectClass = {
  wide: "aspect-[16/10]",
  portrait: "aspect-[4/5] sm:aspect-[3/4]",
} as const;

function frameClassName({
  frameless,
  dark,
  aspect,
  className,
}: Pick<SectionMediaPlaceholderProps, "frameless" | "dark" | "aspect" | "className">) {
  if (frameless) {
    return `relative w-full border-0 bg-transparent shadow-none ${className ?? ""}`;
  }

  const aspectRatio = aspectClass[aspect ?? "wide"];
  return `relative overflow-hidden rounded-2xl border ${
    dark ? "border-white/12 bg-white/[0.03]" : "border-[var(--line)] bg-[var(--tone)]"
  } ${aspectRatio} ${className ?? ""}`;
}

function MediaOverlay({ dark, frameless }: { dark?: boolean; frameless?: boolean }) {
  if (frameless) return null;

  return (
    <div
      className={`pointer-events-none absolute inset-0 ${
        dark
            ? "bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,transparent_40%,rgba(0,0,0,0.18)_100%)]"
          : "bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,transparent_45%,rgba(21,21,21,0.04)_100%)]"
      }`}
      aria-hidden
    />
  );
}

function MediaWithScroll({
  src,
  alt,
  kind,
  poster,
  frameless,
  dark,
  className,
  aspect,
  progress,
  motionMode,
}: SectionMediaPlaceholderProps & {
  progress: MotionValue<number>;
  motionMode: "parallax" | "focus-scale";
}) {
  const imageScale = useTransform(progress, (v) => {
    if (motionMode === "focus-scale") {
      if (v <= 0.15) return 1.08;
      if (v <= 0.55) return 1.08 + ((1 - 1.08) * (v - 0.15)) / 0.4;
      if (v <= 0.85) return 1 + ((1.02 - 1) * (v - 0.55)) / 0.3;
      return 1.02;
    }
    return 1.06 + (1 - 1.06) * v;
  });
  const imageY = useTransform(progress, [0, 1], ["3%", "-3%"]);

  const frameClass = frameClassName({ frameless, dark, aspect, className });

  if (frameless) {
    return (
      <div className={frameClass}>
        <motion.div
          style={{ scale: imageScale, y: motionMode === "parallax" ? imageY : undefined }}
        >
          <SectionMedia src={src} alt={alt} kind={kind} poster={poster} frameless />
        </motion.div>
      </div>
    );
  }

  return (
    <div className={frameClass}>
      <motion.div
        className="absolute inset-0"
        style={{ scale: imageScale, y: motionMode === "parallax" ? imageY : undefined }}
      >
        <SectionMedia src={src} alt={alt} kind={kind} poster={poster} />
      </motion.div>
      <MediaOverlay dark={dark} frameless={frameless} />
    </div>
  );
}

export function SectionMediaPlaceholder({
  src,
  alt,
  kind = "image",
  poster,
  frameless = kind === "video",
  dark = false,
  className,
  aspect = "wide",
  motion: motionMode = "enter",
}: SectionMediaPlaceholderProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSectionScrollProgress();
  const frameClass = frameClassName({ frameless, dark, aspect, className });

  if (reduceMotion) {
    return (
      <div className={frameClass}>
        <SectionMedia
          src={kind === "video" && poster ? poster : src}
          alt={alt}
          kind={kind === "video" && poster ? "image" : kind}
          poster={poster}
          autoPlay={false}
          frameless={frameless}
        />
      </div>
    );
  }

  if (progress && (motionMode === "parallax" || motionMode === "focus-scale")) {
    return (
      <MediaWithScroll
        src={src}
        alt={alt}
        kind={kind}
        poster={poster}
        frameless={frameless}
        dark={dark}
        className={className}
        aspect={aspect}
        progress={progress}
        motionMode={motionMode}
      />
    );
  }

  if (frameless) {
    return (
      <motion.div
        className={frameClass}
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          initial={{ scale: 1.05 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        >
          <SectionMedia src={src} alt={alt} kind={kind} poster={poster} frameless />
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={frameClass}
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.05 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
      >
        <SectionMedia src={src} alt={alt} kind={kind} poster={poster} />
      </motion.div>
      <MediaOverlay dark={dark} frameless={frameless} />
    </motion.div>
  );
}
