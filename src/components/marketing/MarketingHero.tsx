"use client";

import { Pause, Play } from "lucide-react";
import { useCallback, useState } from "react";

import { MarketingCarousel } from "@/components/marketing/MarketingCarousel";
import { homeHeroPortraits } from "@/lib/marketing/homepage-content";

import "./marketing-demo.css";

export function MarketingHero() {
  const [activeIndex, setActiveIndex] = useState(0);
  // An explicit pause sticks until the viewer resumes; hover, focus, drag, tab
  // visibility, offscreen, and reduced motion are handled inside the carousel.
  const [userPaused, setUserPaused] = useState(false);
  const [autoplayRunning, setAutoplayRunning] = useState(false);
  const slide = homeHeroPortraits[activeIndex] ?? homeHeroPortraits[0];

  const onAutoplayStateChange = useCallback((running: boolean) => {
    setAutoplayRunning(running);
  }, []);

  if (!slide) return null;

  return (
    <div className="marketing-hero marketing-hero--portraits">
      <div className="marketing-hero__stage">
        <div className="marketing-hero__window">
          <MarketingCarousel
            slides={homeHeroPortraits}
            activeIndex={activeIndex}
            onIndexChange={setActiveIndex}
            pausedExternal={userPaused}
            onAutoplayStateChange={onAutoplayStateChange}
          />
        </div>
      </div>

      <div className="marketing-hero__controls">
        <div className="marketing-hero__dots">
          {homeHeroPortraits.map((item, index) => {
            const current = index === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                className="marketing-hero__dot"
                aria-label={`Show portrait ${index + 1} of ${homeHeroPortraits.length}`}
                aria-pressed={current}
                data-current={current ? "true" : "false"}
                onClick={() => setActiveIndex(index)}
              >
                <span className="marketing-hero__dot-mark" aria-hidden />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="marketing-hero__playpause"
          aria-label={userPaused ? "Resume portrait slideshow" : "Pause portrait slideshow"}
          onClick={() => setUserPaused((paused) => !paused)}
        >
          {userPaused || !autoplayRunning ? (
            <Play className="size-3.5" aria-hidden />
          ) : (
            <Pause className="size-3.5" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}
