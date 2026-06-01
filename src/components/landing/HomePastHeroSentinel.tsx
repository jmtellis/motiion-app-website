"use client";

import { useEffect } from "react";

import { HOME_HERO_SENTINEL_ID } from "./home-hero-sentinel";

/** Sticky header height — keep in sync with header `min-h-[4.25rem]` (~72px). */
const HEADER_OFFSET_PX = 72;

export function dispatchHomePastHero(detail: { pastHero: boolean }) {
  window.dispatchEvent(new CustomEvent("home-past-hero", { detail }));
}

/** Place at the top of post-hero content; fires when user scrolls into the main page body. */
export function HomePastHeroSentinel() {
  useEffect(() => {
    const sentinel = document.getElementById(HOME_HERO_SENTINEL_ID);
    if (!sentinel) return;

    const update = () => {
      const top = sentinel.getBoundingClientRect().top;
      dispatchHomePastHero({ pastHero: top <= HEADER_OFFSET_PX });
    };

    update();

    const observer = new IntersectionObserver(
      ([entry]) => {
        dispatchHomePastHero({
          pastHero: entry.boundingClientRect.top <= HEADER_OFFSET_PX,
        });
      },
      { threshold: [0, 1], rootMargin: `-${HEADER_OFFSET_PX}px 0px 0px 0px` },
    );

    observer.observe(sentinel);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      id={HOME_HERO_SENTINEL_ID}
      className="pointer-events-none -mt-px h-px w-full shrink-0"
      aria-hidden
    />
  );
}
