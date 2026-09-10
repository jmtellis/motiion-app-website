"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

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

const WORKSPACE_TABS = ["Breakdown", "Invite", "Review Submissions", "Client Review", "Cast"];

function shortlistForBeat(beat: string) {
  if (beat === "confirm" || beat === "hold") {
    return ["dancer-gabriela", "dancer-jay", "dancer-jake", "dancer-gaynor"];
  }
  if (beat === "callback") {
    return ["dancer-gabriela", "dancer-jay", "dancer-gaynor"];
  }
  if (beat === "shortlist") {
    return ["dancer-gabriela", "dancer-gaynor"];
  }
  return [];
}

export function CastingScene({ play, reduceMotion = false, playKey }: MarketingSceneProps) {
  const beat = useSceneTimeline(STEPS, { play, reduceMotion, restartKey: playKey });
  const submissions = demoDancers.slice(0, 8);
  const shortlist = shortlistForBeat(beat)
    .map((id) => demoDancers.find((entry) => entry.id === id))
    .filter((item): item is (typeof demoDancers)[number] => Boolean(item));
  const selectedId =
    beat === "confirm" || beat === "hold"
      ? "dancer-gabriela"
      : beat === "callback"
        ? "dancer-jay"
        : null;

  return (
    <MarketingScene>
      <MockArtboard>
        <header className="md-mock__chrome md-mock__chrome--stack">
          <div className="md-mock__chrome-row">
            <div className="md-mock__project-chrome-identity">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={demoDancers[0]?.imageUrl} alt="" />
              <div>
                <p className="md-mock__title">Summer Tour 2027</p>
                <p className="md-mock__eyebrow">World Tour</p>
              </div>
            </div>
          </div>
          <nav className="md-mock__underline-tabs md-mock__underline-tabs--workspace">
            {WORKSPACE_TABS.map((tab) => (
              <span
                key={tab}
                className={`md-mock__underline-tab${
                  tab === "Review Submissions" ? " md-mock__underline-tab--active" : ""
                }`}
              >
                {tab}
              </span>
            ))}
          </nav>
        </header>

        <div className="md-mock__body">
          <div className="md-mock__casting">
            <section className="md-mock__casting-main">
              <div className="md-mock__casting-toolbar">
                <div>
                  <h3>Tour Ensemble</h3>
                  <p>{submissions.length} submissions</p>
                </div>
                <div className="md-mock__segment md-mock__segment--sm" aria-hidden>
                  <span className="md-mock__segment-item md-mock__segment-item--active">Cards</span>
                  <span className="md-mock__segment-item">Focus</span>
                </div>
              </div>
              <div className="md-mock__submission-grid">
                {submissions.map((dancer) => {
                  const shortlisted = shortlist.some((item) => item.id === dancer.id);
                  return (
                    <article
                      key={dancer.id}
                      className={`md-mock__submission-card${
                        selectedId === dancer.id ? " md-mock__submission-card--selected" : ""
                      }${shortlisted ? " md-mock__submission-card--shortlisted" : ""}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={dancer.imageUrl} alt="" />
                      <div>
                        <strong>{dancer.name}</strong>
                        <span>{dancer.agency}</span>
                      </div>
                    </article>
                  );
                })}
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
                      Shortlist talent from the cards
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
                          <span>Shortlisted</span>
                        </div>
                        <X className="size-3.5 md-mock__shortlist-remove" aria-hidden />
                      </motion.li>
                    ))
                  )}
                </AnimatePresence>
              </ul>
            </aside>
          </div>
        </div>
      </MockArtboard>
    </MarketingScene>
  );
}
