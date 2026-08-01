"use client";

import { AnimatePresence, motion } from "motion/react";

import { MarketingScene, type MarketingSceneProps } from "@/components/marketing/MarketingScene";
import { MockArtboard } from "@/components/marketing/MockArtboard";
import { useSceneTimeline } from "@/components/marketing/useSceneTimeline";
import { demoDancers } from "@/lib/demo/dancers";

const EASE = [0.22, 1, 0.36, 1] as const;

const STEPS = [
  { at: 0, set: "submissions" },
  { at: 1600, set: "shortlist" },
  { at: 3200, set: "callback" },
  { at: 4600, set: "confirm" },
  { at: 6000, set: "hold" },
];

function shortlistForBeat(beat: string) {
  if (beat === "confirm" || beat === "hold") {
    return [
      { id: "dancer-gabriela", status: "Selected" },
      { id: "dancer-jay", status: "Selected" },
      { id: "dancer-jake", status: "Callback" },
      { id: "dancer-gaynor", status: "Shortlisted" },
    ];
  }
  if (beat === "callback") {
    return [
      { id: "dancer-gabriela", status: "Callback" },
      { id: "dancer-jay", status: "Shortlisted" },
      { id: "dancer-gaynor", status: "Shortlisted" },
    ];
  }
  if (beat === "shortlist") {
    return [
      { id: "dancer-gabriela", status: "Shortlisted" },
      { id: "dancer-gaynor", status: "Shortlisted" },
    ];
  }
  return [];
}

export function CastingScene({ play, reduceMotion = false, playKey }: MarketingSceneProps) {
  const beat = useSceneTimeline(STEPS, { play, reduceMotion, restartKey: playKey });
  const submissions = demoDancers.slice(0, 6);
  const shortlist = shortlistForBeat(beat)
    .map((item) => {
      const dancer = demoDancers.find((entry) => entry.id === item.id);
      if (!dancer) return null;
      return { ...dancer, status: item.status };
    })
    .filter((item): item is (typeof demoDancers)[number] & { status: string } => Boolean(item));
  const selectedId =
    beat === "confirm" || beat === "hold"
      ? "dancer-gabriela"
      : beat === "callback"
        ? "dancer-jay"
        : null;

  return (
    <MarketingScene>
      <MockArtboard>
        <header className="md-mock__chrome">
          <div>
            <p className="md-mock__eyebrow">Casting · Review</p>
            <p className="md-mock__title">Tour Ensemble</p>
          </div>
          <div className="md-mock__tabs">
            <span className="md-mock__tab md-mock__tab--active">Review</span>
            <span className="md-mock__tab">Cast</span>
          </div>
        </header>

        <div className="md-mock__body">
          <div className="md-mock__casting">
            <section className="md-mock__casting-main">
              <h3>Submissions</h3>
              <p>New candidates for Tour Ensemble</p>
              <div className="md-mock__submission-row">
                {submissions.map((dancer) => (
                  <article
                    key={dancer.id}
                    className={`md-mock__submission-card${
                      selectedId === dancer.id ? " md-mock__submission-card--selected" : ""
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={dancer.imageUrl} alt="" />
                    <div>
                      <strong>{dancer.name.split(" ")[0]}…</strong>
                      <span>{dancer.agency}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <aside className="md-mock__shortlist">
              <div className="md-mock__shortlist-head">
                <h3>Shortlist</h3>
                <span className="md-mock__badge">{shortlist.length}</span>
              </div>
              <ul className="md-mock__shortlist-list">
                <AnimatePresence mode="popLayout">
                  {shortlist.length === 0 ? (
                    <motion.li
                      key="empty"
                      className="md-mock__empty"
                      initial={false}
                      animate={{ opacity: 1 }}
                    >
                      Select talent to shortlist
                    </motion.li>
                  ) : (
                    shortlist.map((dancer, index) => (
                      <motion.li
                        key={dancer.id}
                        className="md-mock__shortlist-item"
                        layout
                        initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.35, delay: index * 0.05, ease: EASE }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={dancer.imageUrl} alt="" />
                        <div>
                          <strong>{dancer.name}</strong>
                          <span>{dancer.status}</span>
                        </div>
                      </motion.li>
                    ))
                  )}
                </AnimatePresence>
              </ul>
              {(beat === "confirm" || beat === "hold" || reduceMotion) && (
                <motion.span
                  className="md-mock__pill md-mock__pill--success"
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  Selection confirmed
                </motion.span>
              )}
            </aside>
          </div>
        </div>
      </MockArtboard>
    </MarketingScene>
  );
}
