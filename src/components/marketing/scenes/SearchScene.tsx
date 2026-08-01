"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Filter, Mic, PanelRight } from "lucide-react";

import { MarketingScene, type MarketingSceneProps } from "@/components/marketing/MarketingScene";
import { MockArtboard } from "@/components/marketing/MockArtboard";
import { useSceneTimeline } from "@/components/marketing/useSceneTimeline";
import { demoDancers } from "@/lib/demo/dancers";

const QUERY = "Looking for commercial hip-hop dancers in LA.";
const EASE = [0.22, 1, 0.36, 1] as const;
const CHIPS = ["Commercial", "Hip-Hop", "LA", "Available"];
const ROW_LABELS = ["Commercial / Hip-Hop", "Recommended near you", "Tour-ready"];

const STEPS = [
  { at: 0, set: "idle" },
  { at: 350, set: "typing" },
  { at: 2800, set: "chips" },
  { at: 3600, set: "navigate" },
  { at: 4800, set: "hold" },
];

export function SearchScene({ play, reduceMotion = false, playKey }: MarketingSceneProps) {
  const beat = useSceneTimeline(STEPS, { play, reduceMotion, restartKey: playKey });
  const [composeText, setComposeText] = useState("");
  const talent = demoDancers;
  const activeIndex = beat === "navigate" || beat === "hold" ? 1 : 0;
  const showChips = beat === "chips" || beat === "navigate" || beat === "hold" || reduceMotion;
  const typing = beat === "typing" && !reduceMotion;

  useEffect(() => {
    setComposeText(reduceMotion ? QUERY : "");
  }, [playKey, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      setComposeText(QUERY);
      return;
    }
    if (!typing) {
      if (beat === "chips" || beat === "navigate" || beat === "hold") {
        setComposeText(QUERY);
      }
      return;
    }

    setComposeText("");
    let index = 0;
    const id = window.setInterval(() => {
      index += 1;
      setComposeText(QUERY.slice(0, index));
      if (index >= QUERY.length) window.clearInterval(id);
    }, 36);
    return () => window.clearInterval(id);
  }, [typing, beat, reduceMotion]);

  return (
    <MarketingScene>
      <MockArtboard className="md-mock--search">
        <header className="md-mock__chrome md-mock__chrome--center">
          <div className="md-mock__chrome-start">
            <span className="md-mock__pill">
              <Filter className="size-3.5" aria-hidden />
              Filters
            </span>
          </div>
          <p className="md-mock__title md-mock__title--nav">{ROW_LABELS[0]}</p>
          <div className="md-mock__chrome-end">
            <span className="md-mock__pill md-mock__pill--active">
              <PanelRight className="size-3.5" aria-hidden />
              Browse
            </span>
          </div>
        </header>

        <div className="md-mock__nav-stage">
          <div className="md-mock__nav-rows">
            {ROW_LABELS.map((label, rowIndex) => (
              <div key={label} className="md-mock__nav-row">
                <p className="md-mock__nav-label">{label}</p>
                <div
                  className="md-mock__nav-track"
                  style={{
                    transform: `translateX(${rowIndex === 0 ? -activeIndex * 182 : rowIndex === 1 ? -80 : -40}px)`,
                  }}
                >
                  {[...talent, ...talent].slice(0, 8).map((dancer, index) => {
                    const isActive = rowIndex === 0 && index === activeIndex + 2;
                    return (
                      <article
                        key={`${label}-${dancer.id}-${index}`}
                        className={`md-mock__talent-card${isActive ? " md-mock__talent-card--active" : ""}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={dancer.imageUrl} alt="" />
                        <div className="md-mock__talent-card-meta">
                          <strong>{dancer.name}</strong>
                          <span>{dancer.location}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="md-mock__compose">
            <div className="md-mock__chips" aria-hidden>
              <AnimatePresence>
                {showChips
                  ? CHIPS.map((chip, index) => (
                      <motion.span
                        key={chip}
                        className="md-mock__chip md-mock__chip--accent"
                        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05, ease: EASE }}
                      >
                        {chip}
                      </motion.span>
                    ))
                  : null}
              </AnimatePresence>
            </div>
            <div className="md-mock__compose-bar">
              <p className="md-mock__compose-text" data-placeholder="Who are you looking for?">
                {composeText}
              </p>
              <div className="md-mock__compose-actions">
                <span className="md-mock__icon-btn">
                  <Mic className="size-4" aria-hidden />
                </span>
                <span className="md-mock__icon-btn md-mock__icon-btn--accent">
                  <ArrowUp className="size-4" aria-hidden />
                </span>
              </div>
            </div>
          </div>
        </div>
      </MockArtboard>
    </MarketingScene>
  );
}
