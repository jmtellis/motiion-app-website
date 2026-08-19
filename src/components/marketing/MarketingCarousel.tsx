"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { motion, type PanInfo, useReducedMotion } from "motion/react";

import type { MarketingSceneProps } from "@/components/marketing/MarketingScene";
import type { HomeHeroPortrait } from "@/lib/marketing/homepage-content";

const EASE = [0.22, 1, 0.36, 1] as const;
const IN_VIEW_THRESHOLD = 0.35;
const SWIPE_OFFSET = 70;
const SWIPE_VELOCITY = 450;
const CROSSFADE_MS = 450;

type MarketingCarouselSlide = HomeHeroPortrait | {
  id: string;
  title: string;
  durationMs: number;
  Scene: ComponentType<MarketingSceneProps>;
};

function isPortraitSlide(slide: MarketingCarouselSlide): slide is HomeHeroPortrait {
  return "src" in slide;
}

function CarouselSlideContent({
  slide,
  play,
  reduceMotion,
  playKey,
  priority = false,
}: {
  slide: MarketingCarouselSlide;
  play: boolean;
  reduceMotion: boolean;
  playKey: number;
  priority?: boolean;
}) {
  if (isPortraitSlide(slide)) {
    return (
      <Image
        src={slide.src}
        alt={slide.alt}
        fill
        priority={priority}
        sizes="(max-width: 959px) 100vw, 50vw"
        className="marketing-carousel__image"
        style={{ objectPosition: slide.objectPosition }}
      />
    );
  }

  const Scene = slide.Scene;
  return <Scene play={play} reduceMotion={reduceMotion} playKey={playKey} />;
}

export function MarketingCarousel({
  slides,
  activeIndex,
  onIndexChange,
  pausedExternal = false,
}: {
  slides: MarketingCarouselSlide[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  pausedExternal?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const activeIndexRef = useRef(activeIndex);
  const lastRenderedRef = useRef(activeIndex);
  const fadeTimerRef = useRef<number | null>(null);

  activeIndexRef.current = activeIndex;

  // Hover pauses slide autoplay only — scene timelines keep running so demos stay readable.
  const autoplayPaused =
    Boolean(reduceMotion) || !inView || hovered || dragging || pausedExternal;
  const scenePlay = !Boolean(reduceMotion) && inView && !dragging && !pausedExternal;
  const active = slides[activeIndex] ?? slides[0];
  const previous = prevIndex != null ? slides[prevIndex] : null;
  const nextIndex = slides.length ? (activeIndex + 1) % slides.length : 0;
  const next = slides[nextIndex];

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setInView(entry.isIntersecting && entry.intersectionRatio >= IN_VIEW_THRESHOLD);
      },
      { threshold: [0, IN_VIEW_THRESHOLD, 0.6, 0.85] },
    );

    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (activeIndex === lastRenderedRef.current) return;

    if (fadeTimerRef.current != null) window.clearTimeout(fadeTimerRef.current);
    setPrevIndex(lastRenderedRef.current);
    lastRenderedRef.current = activeIndex;

    fadeTimerRef.current = window.setTimeout(
      () => {
        setPrevIndex(null);
        fadeTimerRef.current = null;
      },
      reduceMotion ? 120 : CROSSFADE_MS,
    );
  }, [activeIndex, reduceMotion]);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current != null) window.clearTimeout(fadeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (autoplayPaused || slides.length < 2 || !active) return;

    const timer = window.setTimeout(() => {
      onIndexChange((activeIndexRef.current + 1) % slides.length);
    }, active.durationMs);

    return () => window.clearTimeout(timer);
  }, [autoplayPaused, active, slides.length, onIndexChange, activeIndex]);

  const goTo = useCallback(
    (index: number) => {
      if (!slides.length) return;
      const nextValue = ((index % slides.length) + slides.length) % slides.length;
      if (nextValue === activeIndexRef.current) return;
      onIndexChange(nextValue);
    },
    [onIndexChange, slides.length],
  );

  const onDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      setDragging(false);
      const { offset, velocity } = info;
      if (offset.x < -SWIPE_OFFSET || velocity.x < -SWIPE_VELOCITY) {
        goTo(activeIndexRef.current + 1);
        return;
      }
      if (offset.x > SWIPE_OFFSET || velocity.x > SWIPE_VELOCITY) {
        goTo(activeIndexRef.current - 1);
      }
    },
    [goTo],
  );

  if (!active) return null;

  const preload = next && next.id !== active.id && next.id !== previous?.id ? next : null;

  return (
    <div
      ref={rootRef}
      className="marketing-carousel"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {previous ? (
        <motion.div
          className="marketing-carousel__slide"
          aria-hidden
          initial={false}
          animate={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : CROSSFADE_MS / 1000, ease: EASE }}
        >
          <CarouselSlideContent
            slide={previous}
            play={false}
            reduceMotion={Boolean(reduceMotion)}
            playKey={prevIndex ?? 0}
          />
        </motion.div>
      ) : null}

      <motion.div
        key={active.id}
        className="marketing-carousel__slide marketing-carousel__slide--active"
        drag={reduceMotion ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        onDragStart={() => setDragging(true)}
        onDragEnd={onDragEnd}
        initial={reduceMotion || prevIndex == null ? false : { opacity: 0 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reduceMotion ? 0.12 : CROSSFADE_MS / 1000, ease: EASE }}
      >
        <CarouselSlideContent
          slide={active}
          play={scenePlay}
          reduceMotion={Boolean(reduceMotion)}
          playKey={activeIndex}
          priority={activeIndex === 0}
        />
      </motion.div>

      {preload ? (
        <div className="marketing-carousel__slide marketing-carousel__slide--preload" aria-hidden>
          <CarouselSlideContent
            slide={preload}
            play={false}
            reduceMotion={Boolean(reduceMotion)}
            playKey={0}
          />
        </div>
      ) : null}
    </div>
  );
}
