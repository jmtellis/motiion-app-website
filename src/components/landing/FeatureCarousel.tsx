"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";

import type { EditorialPart } from "@/lib/marketing/homepage-content";

import "./feature-carousel.css";

type CarouselSlide = {
  id: string;
  titleParts: EditorialPart[];
  description: string;
  image: { src: string; alt: string; kind?: "image" | "video"; poster?: string };
};

type CarouselLayout = {
  slideWidth: number;
  gap: number;
  viewportWidth: number;
};

function slideTitle(slide: CarouselSlide) {
  return slide.titleParts.map((part) => (typeof part === "string" ? part : part.text)).join("");
}

function CarouselMedia({ image }: { image: CarouselSlide["image"] }) {
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

function CarouselSlideCard({ slide }: { slide: CarouselSlide }) {
  return (
    <article className="feature-carousel__card" aria-label={slideTitle(slide)}>
      <CarouselMedia image={slide.image} />
    </article>
  );
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

export function FeatureCarousel({
  title,
  slides,
}: {
  title: string;
  slides: CarouselSlide[];
}) {
  const reduceMotion = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const trackIndexRef = useRef(slides.length > 1 ? 1 : 0);
  const layoutRef = useRef<CarouselLayout>({ slideWidth: 0, gap: 16, viewportWidth: 0 });
  const skipNextAnimationRef = useRef(false);
  const slideCount = slides.length;
  const canLoop = slideCount > 1;

  const trackSlides = useMemo(() => {
    if (!canLoop) return slides;

    return [
      { ...slides[slideCount - 1], id: `${slides[slideCount - 1].id}-clone-start` },
      ...slides,
      { ...slides[0], id: `${slides[0].id}-clone-end` },
    ];
  }, [canLoop, slideCount, slides]);

  const [trackIndex, setTrackIndex] = useState(canLoop ? 1 : 0);
  const [centeredIndex, setCenteredIndex] = useState(canLoop ? 1 : 0);
  const [layout, setLayout] = useState<CarouselLayout>({ slideWidth: 0, gap: 16, viewportWidth: 0 });
  const x = useMotionValue(0);

  trackIndexRef.current = trackIndex;
  layoutRef.current = layout;

  const activeIndex = logicalIndexForTrack(trackIndex, slideCount, canLoop);

  useEffect(() => {
    slides.forEach((slide) => {
      if (slide.image.kind === "video") return;
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
    const nextIndex = canLoop ? 1 : 0;
    trackIndexRef.current = nextIndex;
    setTrackIndex(nextIndex);
    setCenteredIndex(nextIndex);
  }, [canLoop, slideCount]);

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
      setTrackIndex((index) => Math.min(slideCount - 1, index + 1));
      return;
    }

    setTrackIndex((index) => index + 1);
  }, [canLoop, slideCount]);

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

  const activeSlide = slides[activeIndex];

  return (
    <section id="product" className="feature-carousel marketing-viewport-section border-t border-[#262626] bg-[var(--stage-black)]">
      <div className="feature-carousel__header">
        <h2 className="type-heading-1 text-balance text-on-dark-primary">{title}</h2>
      </div>

      <div className="feature-carousel__body">
        <div className="feature-carousel__stage">
          <div ref={viewportRef} className="feature-carousel__viewport">
            <motion.div ref={trackRef} className="feature-carousel__track" style={{ x }}>
              {trackSlides.map((slide, index) => {
                const isActive = index === centeredIndex;

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
            <div className="feature-carousel__footer-copy">
              <p className="feature-carousel__meta-title">
                {String(activeIndex + 1).padStart(2, "0")}. {slideTitle(activeSlide)}
              </p>
              <p className="feature-carousel__meta-description">{activeSlide.description}</p>
            </div>

            <div className="feature-carousel__controls">
              <button
                type="button"
                className="feature-carousel__control"
                aria-label="Previous slide"
                disabled={!canLoop && trackIndex === 0}
                onClick={goPrev}
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                className="feature-carousel__control"
                aria-label="Next slide"
                disabled={!canLoop && trackIndex === slideCount - 1}
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
