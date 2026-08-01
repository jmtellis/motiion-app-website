"use client";

import { motion } from "motion/react";

import { MarketingScene, type MarketingSceneProps } from "@/components/marketing/MarketingScene";
import { MockArtboard } from "@/components/marketing/MockArtboard";
import { useSceneTimeline } from "@/components/marketing/useSceneTimeline";
import { demoDancers } from "@/lib/demo/dancers";

const EASE = [0.22, 1, 0.36, 1] as const;

const STEPS = [
  { at: 0, set: "team" },
  { at: 1200, set: "availability" },
  { at: 2800, set: "finalize" },
  { at: 4200, set: "complete" },
  { at: 6000, set: "zoom" },
];

function statusForBeat(beat: string, dancerId: string) {
  if (beat === "complete" || beat === "zoom" || beat === "finalize") {
    if (dancerId === "dancer-gabriela") return "Confirmed";
    if (dancerId === "dancer-jay") return "Accepted";
    return "Offer sent";
  }
  if (beat === "availability") {
    if (dancerId === "dancer-gabriela") return "Availability requested";
    return "Selected";
  }
  return "Selected";
}

const TEAM = ["dancer-gabriela", "dancer-jay", "dancer-jake"] as const;

export function BookingScene({ play, reduceMotion = false, playKey }: MarketingSceneProps) {
  const beat = useSceneTimeline(STEPS, { play, reduceMotion, restartKey: playKey });
  const finalized = beat === "finalize" || beat === "complete" || beat === "zoom" || reduceMotion;
  const zooming = beat === "zoom" && !reduceMotion;

  const cards = TEAM.map((id) => {
    const dancer = demoDancers.find((entry) => entry.id === id);
    return dancer
      ? { ...dancer, status: statusForBeat(beat, id) }
      : null;
  }).filter((item): item is (typeof demoDancers)[number] & { status: string } => Boolean(item));

  return (
    <MarketingScene>
      <motion.div
        style={{ width: "100%", height: "100%" }}
        animate={{ scale: zooming ? 0.94 : 1, opacity: zooming ? 0.88 : 1 }}
        transition={{ duration: 1, ease: EASE }}
      >
        <MockArtboard>
          <header className="md-mock__chrome">
            <div>
              <p className="md-mock__eyebrow">Casting · Cast</p>
              <p className="md-mock__title">Summer Tour 2027</p>
            </div>
            <span className={`md-mock__pill${finalized ? " md-mock__pill--success" : ""}`}>
              {finalized ? "Team booked" : "Final selects"}
            </span>
          </header>

          <div className="md-mock__body">
            <div className="md-mock__finals">
              <div className="md-mock__finals-head">
                <h3>Final Selects ({cards.length})</h3>
                {finalized ? (
                  <span className="md-mock__chip">Finalized — selections locked</span>
                ) : null}
              </div>

              {cards.map((dancer) => (
                <article key={dancer.id} className="md-mock__final-card">
                  <div className="md-mock__final-card-head">
                    <div>
                      <strong>{dancer.agency}</strong>
                      <span>1 person</span>
                    </div>
                    <span className="md-mock__pill">Book</span>
                  </div>
                  <ul className="md-mock__final-people">
                    <li className="md-mock__final-person">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={dancer.imageUrl} alt="" />
                      <div>
                        <strong>{dancer.name}</strong>
                        <span>Tour Ensemble · {dancer.status}</span>
                      </div>
                    </li>
                  </ul>
                </article>
              ))}

              <div className="md-mock__final-footer">
                <span className={`md-mock__btn${finalized ? " md-mock__btn--disabled" : ""}`}>
                  Finalize casting
                </span>
              </div>
            </div>
          </div>
        </MockArtboard>
      </motion.div>
    </MarketingScene>
  );
}
