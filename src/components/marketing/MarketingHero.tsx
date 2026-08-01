"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { MarketingBrowserChrome } from "@/components/marketing/MarketingBrowserChrome";
import { MarketingCarousel } from "@/components/marketing/MarketingCarousel";
import { marketingDemoSlides } from "@/lib/marketing/demo-slides";

import "./marketing-demo.css";

const EASE = [0.22, 1, 0.36, 1] as const;

export function MarketingHero() {
  const [activeIndex, setActiveIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const slide = marketingDemoSlides[activeIndex] ?? marketingDemoSlides[0];

  if (!slide) return null;

  return (
    <div className="marketing-hero">
      <div className="marketing-hero__stage">
        <div className="marketing-hero__caption" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={slide.id}
              className="marketing-hero__caption-inner"
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.35, ease: EASE }}
            >
              <p className="marketing-hero__caption-title">{slide.title}</p>
              <p className="marketing-hero__caption-desc">{slide.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="marketing-hero__window" aria-label={slide.title}>
          <MarketingBrowserChrome url={slide.url} />
          <MarketingCarousel
            slides={marketingDemoSlides}
            activeIndex={activeIndex}
            onIndexChange={setActiveIndex}
          />
        </div>
      </div>

      <div className="marketing-hero__dots" role="tablist" aria-label="Product demo slides">
        {marketingDemoSlides.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-label={item.title}
            aria-current={index === activeIndex ? "true" : undefined}
            className="marketing-hero__dot"
            onClick={() => setActiveIndex(index)}
          />
        ))}
      </div>
    </div>
  );
}
