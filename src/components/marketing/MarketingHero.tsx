"use client";

import { useState } from "react";

import { MarketingCarousel } from "@/components/marketing/MarketingCarousel";
import { homeHeroPortraits } from "@/lib/marketing/homepage-content";

import "./marketing-demo.css";

export function MarketingHero() {
  const [activeIndex, setActiveIndex] = useState(0);
  const slide = homeHeroPortraits[activeIndex] ?? homeHeroPortraits[0];

  if (!slide) return null;

  return (
    <div className="marketing-hero marketing-hero--portraits">
      <div className="marketing-hero__stage">
        <div className="marketing-hero__window" aria-label="Featured dancers">
          <MarketingCarousel
            slides={homeHeroPortraits}
            activeIndex={activeIndex}
            onIndexChange={setActiveIndex}
          />
        </div>
      </div>

      <div className="marketing-hero__dots" role="tablist" aria-label="Featured dancer portraits">
        {homeHeroPortraits.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-label={`Show portrait ${index + 1}`}
            aria-current={index === activeIndex ? "true" : undefined}
            className="marketing-hero__dot"
            onClick={() => setActiveIndex(index)}
          />
        ))}
      </div>
    </div>
  );
}
