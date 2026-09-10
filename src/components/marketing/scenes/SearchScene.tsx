"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, ChevronDown, ChevronLeft, ChevronRight, Filter, Mic } from "lucide-react";

import { MarketingScene, type MarketingSceneProps } from "@/components/marketing/MarketingScene";
import { MockArtboard } from "@/components/marketing/MockArtboard";
import { useSceneTimeline } from "@/components/marketing/useSceneTimeline";
import { demoDancers } from "@/lib/demo/dancers";

const QUERY = "Looking for commercial hip-hop dancers in LA.";
const EASE = [0.22, 1, 0.36, 1] as const;
const CHIPS = ["Commercial", "Hip-Hop", "LA", "Available"];

const CELL_W = 226;
const CELL_H = 300;
const STEP_X = 240;
const STEP_Y = 314;
const COL_OFFSETS = [-2, -1, 0, 1, 2] as const;
const ROW_OFFSETS = [-1, 0, 1] as const;

const STEPS = [
  { at: 0, set: "idle" },
  { at: 350, set: "typing" },
  { at: 2800, set: "chips" },
  { at: 3600, set: "navigate" },
  { at: 4800, set: "hold" },
];

type GridCell = {
  key: string;
  dancerIndex: number;
  colOffset: number;
  rowOffset: number;
  distance: number;
};

/** Symmetric navigator window around the active card — never letterboxes one side. */
function buildCells(activeDancerOffset: number): GridCell[] {
  const cells: GridCell[] = [];
  let slot = 0;
  for (const rowOffset of ROW_OFFSETS) {
    for (const colOffset of COL_OFFSETS) {
      cells.push({
        key: `${rowOffset}:${colOffset}`,
        dancerIndex: (slot + activeDancerOffset) % demoDancers.length,
        colOffset,
        rowOffset,
        distance: Math.abs(colOffset) + Math.abs(rowOffset),
      });
      slot += 1;
    }
  }
  return cells;
}

export function SearchScene({ play, reduceMotion = false, playKey }: MarketingSceneProps) {
  const beat = useSceneTimeline(STEPS, { play, reduceMotion, restartKey: playKey });
  const [composeText, setComposeText] = useState("");
  // Rotate who sits in the center card; keep geometry centered in the frame.
  const activeDancerOffset = beat === "navigate" || beat === "hold" ? 1 : 0;
  const cells = buildCells(activeDancerOffset);
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
          <div className="md-mock__chrome-start" />
          <div className="md-mock__segment" aria-hidden>
            <span className="md-mock__segment-item md-mock__segment-item--active">Discover</span>
            <span className="md-mock__segment-item">Browse</span>
          </div>
          <div className="md-mock__chrome-end" />
        </header>

        <div className="md-mock__nav-stage">
          <div className="md-mock__nav-grid-bg" aria-hidden />
          <div className="md-mock__nav-viewport">
            {cells.map((cell) => {
              const dancer = demoDancers[cell.dancerIndex];
              if (!dancer) return null;
              const isActive = cell.distance === 0;
              const cx = cell.colOffset * STEP_X;
              const cy = cell.rowOffset * STEP_Y;
              const scale = isActive ? 1 : cell.distance === 1 ? 0.92 : 0.84;
              const opacity = isActive ? 1 : cell.distance === 1 ? 0.72 : 0.38;
              return (
                <article
                  key={`${cell.key}-${dancer.id}`}
                  className={`md-mock__nav-card${isActive ? " md-mock__nav-card--active" : ""}`}
                  style={{
                    width: CELL_W,
                    height: CELL_H,
                    transform: `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px)) scale(${scale})`,
                    opacity,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={dancer.imageUrl} alt="" />
                  <div className="md-mock__nav-card-meta">
                    <strong>{dancer.name}</strong>
                    <span>{dancer.location}</span>
                  </div>
                </article>
              );
            })}

            <span className="md-mock__nav-arrow md-mock__nav-arrow--left" aria-hidden>
              <ChevronLeft className="size-4" />
            </span>
            <span className="md-mock__nav-arrow md-mock__nav-arrow--right" aria-hidden>
              <ChevronRight className="size-4" />
            </span>
            <span className="md-mock__nav-arrow md-mock__nav-arrow--down" aria-hidden>
              <ChevronDown className="size-4" />
            </span>
            <div className="md-mock__nav-vignette" aria-hidden />
            <div className="md-mock__nav-edge md-mock__nav-edge--left" aria-hidden />
            <div className="md-mock__nav-edge md-mock__nav-edge--right" aria-hidden />
          </div>

          <div className="md-mock__compose">
            <div className="md-mock__compose-meta">
              <span className="md-mock__pill md-mock__pill--ghost">
                <Filter className="size-3.5" aria-hidden />
                Filters
              </span>
              <div className="md-mock__chips" aria-hidden>
                <AnimatePresence>
                  {showChips
                    ? CHIPS.map((chip, index) => (
                        <motion.span
                          key={chip}
                          className="md-mock__chip"
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
