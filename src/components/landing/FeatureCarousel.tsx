"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";

import type { EditorialPart } from "@/lib/marketing/homepage-content";

import "./feature-carousel.css";

export type FeatureCarouselSlide = {
  id: string;
  title: string;
  titleParts?: EditorialPart[];
  description: string;
  image?: { src: string; alt: string; kind?: "image" | "video"; poster?: string };
  href?: string;
  content?: ReactNode;
  isPlaceholder?: boolean;
};

type CarouselLayout = {
  slideWidth: number;
  gap: number;
  viewportWidth: number;
};

function slideTitle(slide: FeatureCarouselSlide) {
  if (slide.titleParts?.length) {
    return slide.titleParts.map((part) => (typeof part === "string" ? part : part.text)).join("");
  }
  return slide.title;
}

function CarouselMedia({ image }: { image: NonNullable<FeatureCarouselSlide["image"]> }) {
  if (image.kind === "video") {
    return (
      <video
        src={image.src}
        poster={image.poster}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-label={image.alt}
        className="feature-carousel__media"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.src}
      alt={image.alt}
      className="feature-carousel__media"
      loading="eager"
      decoding="sync"
      fetchPriority="high"
    />
  );
}

function CarouselSlideCard({ slide }: { slide: FeatureCarouselSlide }) {
  if (slide.isPlaceholder) {
    return (
      <article
        className="feature-carousel__card feature-carousel__card--placeholder"
        aria-hidden="true"
      >
        <div className="feature-carousel__placeholder" />
      </article>
    );
  }

  const card = (
    <article className="feature-carousel__card" aria-label={slideTitle(slide)}>
      {slide.content ? (
        slide.content
      ) : slide.image ? (
        <CarouselMedia image={slide.image} />
      ) : (
        <div className="feature-carousel__placeholder">
          <span className="feature-carousel__placeholder-label">{slide.title}</span>
        </div>
      )}
    </article>
  );

  if (slide.href) {
    return (
      <Link href={slide.href} className="feature-carousel__card-link">
        {card}
      </Link>
    );
  }

  return card;
}

function logicalIndexForTrack(trackIndex: number, slideCount: number, canLoop: boolean) {
  if (!canLoop) return trackIndex;
  if (trackIndex === 0) return slideCount - 1;
  if (trackIndex === slideCount + 1) return 0;
  return trackIndex - 1;
}

function centeredIndexForX(xValue: number, layout: CarouselLayout) {
  if (!layout.slideWidth || !layout.viewportWidth) return 0;

  const slideSpan = layout.slideWidth + layout.gap;
  const centerOffset = (layout.viewportWidth - layout.slideWidth) / 2;
  return Math.round((centerOffset - xValue) / slideSpan);
}

function offsetForIndex(index: number, layout: CarouselLayout) {
  if (!layout.slideWidth || !layout.viewportWidth) return 0;

  const slideSpan = layout.slideWidth + layout.gap;
  const centered = index * slideSpan - (layout.viewportWidth - layout.slideWidth) / 2;
  return -centered;
}

const PLACEHOLDER_START: FeatureCarouselSlide = {
  id: "fc-placeholder-start",
  title: "",
  description: "",
  isPlaceholder: true,
};

const PLACEHOLDER_END: FeatureCarouselSlide = {
  id: "fc-placeholder-end",
  title: "",
  description: "",
  isPlaceholder: true,
};

function initialTrackIndex(canLoop: boolean, useFlankPlaceholders: boolean) {
  if (useFlankPlaceholders) return 1;
  if (canLoop) return 1;
  return 0;
}

export function FeatureCarousel({
  title,
  slides,
  onActiveIndexChange,
  variant = "marketing",
  className = "",
  id,
  flankWithPlaceholders = false,
  showFooterCopy = true,
  showFooterTitle = false,
  showFooterDescription = false,
}: {
  title?: string;
  slides: FeatureCarouselSlide[];
  onActiveIndexChange?: (index: number) => void;
  variant?: "marketing" | "embedded";
  className?: string;
  id?: string;
  /** When only one slide exists, show empty card shells on the left and right. */
  flankWithPlaceholders?: boolean;
  /** Show numbered title and description under the carousel stage. */
  showFooterCopy?: boolean;
  /** Show only the active slide title under the carousel stage. */
  showFooterTitle?: boolean;
  /** Show the active slide description without the numbered marketing title. */
  showFooterDescription?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const slideCount = slides.length;
  const canLoop = slideCount > 1;
  const useFlankPlaceholders = flankWithPlaceholders && slideCount === 1;
  const trackIndexRef = useRef(initialTrackIndex(canLoop, useFlankPlaceholders));
  const layoutRef = useRef<CarouselLayout>({ slideWidth: 0, gap: 16, viewportWidth: 0 });
  const skipNextAnimationRef = useRef(false);

  const trackSlides = useMemo(() => {
    if (canLoop) {
      return [
        { ...slides[slideCount - 1], id: `${slides[slideCount - 1].id}-clone-start` },
        ...slides,
        { ...slides[0], id: `${slides[0].id}-clone-end` },
      ];
    }

    if (useFlankPlaceholders) {
      return [PLACEHOLDER_START, slides[0], PLACEHOLDER_END];
    }

    return slides;
  }, [canLoop, slideCount, slides, useFlankPlaceholders]);

  const [trackIndex, setTrackIndex] = useState(() => initialTrackIndex(canLoop, useFlankPlaceholders));
  const [centeredIndex, setCenteredIndex] = useState(() => initialTrackIndex(canLoop, useFlankPlaceholders));
  const [layout, setLayout] = useState<CarouselLayout>({ slideWidth: 0, gap: 16, viewportWidth: 0 });
  const x = useMotionValue(0);

  trackIndexRef.current = trackIndex;
  layoutRef.current = layout;

  const activeIndex = canLoop
    ? logicalIndexForTrack(trackIndex, slideCount, canLoop)
    : useFlankPlaceholders
      ? 0
      : trackIndex;

  useEffect(() => {
    onActiveIndexChange?.(activeIndex);
  }, [activeIndex, onActiveIndexChange]);

  useEffect(() => {
    slides.forEach((slide) => {
      if (!slide.image || slide.image.kind === "video") return;
      const image = new window.Image();
      image.src = slide.image.src;
    });
  }, [slides]);

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const firstSlide = track.querySelector<HTMLElement>(".feature-carousel__slide");
    if (!firstSlide) return;

    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "16") || 16;
    const nextLayout = {
      slideWidth: firstSlide.offsetWidth,
      gap,
      viewportWidth: viewport.offsetWidth,
    };

    layoutRef.current = nextLayout;
    setLayout(nextLayout);
  }, []);

  useEffect(() => {
    measure();
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [measure, trackSlides.length]);

  useEffect(() => {
    const nextIndex = initialTrackIndex(canLoop, useFlankPlaceholders);
    trackIndexRef.current = nextIndex;
    setTrackIndex(nextIndex);
    setCenteredIndex(nextIndex);
  }, [canLoop, slideCount, useFlankPlaceholders]);

  const syncCenteredIndex = useCallback((xValue: number) => {
    const nextCentered = centeredIndexForX(xValue, layoutRef.current);
    setCenteredIndex((current) => (current === nextCentered ? current : nextCentered));
  }, []);

  const commitLoopJump = useCallback(
    (nextIndex: number) => {
      const viewport = viewportRef.current;
      const nextOffset = offsetForIndex(nextIndex, layoutRef.current);

      skipNextAnimationRef.current = true;

      if (viewport) viewport.style.visibility = "hidden";

      x.set(nextOffset);
      trackIndexRef.current = nextIndex;
      setCenteredIndex(nextIndex);
      setTrackIndex(nextIndex);

      requestAnimationFrame(() => {
        if (viewport) viewport.style.visibility = "";
      });
    },
    [x],
  );

  useLayoutEffect(() => {
    const target = offsetForIndex(trackIndex, layout);

    if (skipNextAnimationRef.current) {
      skipNextAnimationRef.current = false;
      x.set(target);
      setCenteredIndex(trackIndex);
      return;
    }

    if (reduceMotion) {
      x.set(target);
      setCenteredIndex(trackIndex);
      return;
    }

    const controls = animate(x, target, {
      type: "tween",
      duration: 0.48,
      ease: [0.32, 0.72, 0, 1],
      onUpdate: (latest) => {
        syncCenteredIndex(latest);

        if (!canLoop) return;

        const currentIndex = trackIndexRef.current;
        const destination = offsetForIndex(currentIndex, layoutRef.current);

        if (Math.abs(latest - destination) > 1.5) return;

        if (currentIndex === slideCount + 1) {
          controls.stop();
          commitLoopJump(1);
          return;
        }

        if (currentIndex === 0) {
          controls.stop();
          commitLoopJump(slideCount);
        }
      },
      onComplete: () => {
        syncCenteredIndex(target);

        if (!canLoop) return;

        const currentIndex = trackIndexRef.current;

        if (currentIndex === slideCount + 1) {
          commitLoopJump(1);
          return;
        }

        if (currentIndex === 0) {
          commitLoopJump(slideCount);
        }
      },
    });

    return () => controls.stop();
  }, [canLoop, commitLoopJump, layout, reduceMotion, slideCount, syncCenteredIndex, trackIndex, x]);

  const goNext = useCallback(() => {
    if (!canLoop) {
      setTrackIndex((index) => Math.min(trackSlides.length - 1, index + 1));
      return;
    }

    setTrackIndex((index) => index + 1);
  }, [canLoop, trackSlides.length]);

  const goPrev = useCallback(() => {
    if (!canLoop) {
      setTrackIndex((index) => Math.max(0, index - 1));
      return;
    }

    setTrackIndex((index) => index - 1);
  }, [canLoop]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev]);

  if (!slides.length) return null;

  const activeSlide = slides[activeIndex];
  const showFooterText = showFooterCopy || showFooterTitle || showFooterDescription;
  const sectionClassName = [
    "feature-carousel",
    variant === "marketing" ? "marketing-viewport-section border-t border-[#262626] bg-[var(--stage-black)]" : "feature-carousel--embedded",
    !showFooterText ? "feature-carousel--footer-controls-only" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      id={id}
      className={sectionClassName}
      aria-roledescription="carousel"
      aria-label={title ?? "Carousel"}
    >
      {title ? (
        <div className="feature-carousel__header">
          <h2 className="type-heading-1 text-balance text-on-dark-primary">{title}</h2>
        </div>
      ) : null}

      <div className="feature-carousel__body">
        <div className="feature-carousel__stage">
          <div ref={viewportRef} className="feature-carousel__viewport">
            <motion.div ref={trackRef} className="feature-carousel__track" style={{ x }}>
              {trackSlides.map((slide, index) => {
                const isActive = index === centeredIndex && !slide.isPlaceholder;

                return (
                  <div key={slide.id} className="feature-carousel__slide">
                    <div
                      className={`feature-carousel__slide-shell${isActive ? " feature-carousel__slide-shell--active" : " feature-carousel__slide-shell--inactive"}`}
                    >
                      <CarouselSlideCard slide={slide} />
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </div>

          <div className="feature-carousel__footer">
            {showFooterText ? (
              <div className="feature-carousel__footer-copy">
                {(showFooterCopy || showFooterTitle) ? (
                  <p
                    className={
                      showFooterCopy
                        ? "feature-carousel__meta-title"
                        : "feature-carousel__meta-title feature-carousel__meta-title--embedded"
                    }
                  >
                    {showFooterCopy ? `${String(activeIndex + 1).padStart(2, "0")}. ` : null}
                    {slideTitle(activeSlide)}
                  </p>
                ) : null}
                {showFooterCopy || showFooterDescription ? (
                  <p className="feature-carousel__meta-description">{activeSlide.description}</p>
                ) : null}
              </div>
            ) : null}

            <div className="feature-carousel__controls">
              <button
                type="button"
                className="feature-carousel__control"
                aria-label="Previous slide"
                disabled={!canLoop && !useFlankPlaceholders && trackIndex === 0}
                onClick={goPrev}
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                className="feature-carousel__control"
                aria-label="Next slide"
                disabled={!canLoop && !useFlankPlaceholders && trackIndex === slideCount - 1}
                onClick={goNext}
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
