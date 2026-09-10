"use client";

import { motion } from "motion/react";
import { Building2, Mail, User } from "lucide-react";

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

const WORKSPACE_TABS = ["Breakdown", "Invite", "Review Submissions", "Client Review", "Cast"];

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

const TEAM = [
  { ids: ["dancer-gabriela"], agency: "Clear Talent Group" },
  { ids: ["dancer-jay", "dancer-jake"], agency: "Bloc Agency (LA)" },
] as const;

export function BookingScene({ play, reduceMotion = false, playKey }: MarketingSceneProps) {
  const beat = useSceneTimeline(STEPS, { play, reduceMotion, restartKey: playKey });
  const finalized = beat === "finalize" || beat === "complete" || beat === "zoom" || reduceMotion;
  const zooming = beat === "zoom" && !reduceMotion;

  return (
    <MarketingScene>
      <motion.div
        style={{ width: "100%", height: "100%" }}
        animate={{ opacity: zooming ? 0.92 : 1 }}
        transition={{ duration: 1, ease: EASE }}
      >
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
                    tab === "Cast" ? " md-mock__underline-tab--active" : ""
                  }`}
                >
                  {tab}
                </span>
              ))}
            </nav>
          </header>

          <div className="md-mock__body">
            <div className="md-mock__finals">
              <div className="md-mock__finals-head">
                <h3>Final Selects (3)</h3>
                {finalized ? (
                  <span className="md-mock__chip">Finalized — selections locked</span>
                ) : null}
              </div>

              {TEAM.map((group) => {
                const people = group.ids
                  .map((id) => demoDancers.find((dancer) => dancer.id === id))
                  .filter((item): item is (typeof demoDancers)[number] => Boolean(item));
                const isDirect = people.length === 1 && !people[0]?.represented;
                return (
                  <article key={group.agency} className="md-mock__final-card">
                    <div className="md-mock__final-card-head">
                      <div className="md-mock__final-identity">
                        <span className="md-mock__final-avatar" aria-hidden>
                          {isDirect ? (
                            <User className="size-3.5" />
                          ) : (
                            <Building2 className="size-3.5" />
                          )}
                        </span>
                        <div>
                          <strong>{group.agency}</strong>
                          <span>
                            {people.length} {people.length === 1 ? "person" : "people"}
                          </span>
                        </div>
                      </div>
                      <span className="md-mock__btn md-mock__btn--ghost md-mock__btn--sm">
                        <Mail className="size-3.5" aria-hidden />
                        Book
                      </span>
                    </div>
                    <ul className="md-mock__final-people">
                      {people.map((dancer) => (
                        <li key={dancer.id} className="md-mock__final-person">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={dancer.imageUrl} alt="" />
                          <div>
                            <strong>{dancer.name}</strong>
                            <span>Tour Ensemble · {statusForBeat(beat, dancer.id)}</span>
                          </div>
                          {!finalized ? (
                            <span className="md-mock__text-btn">Availability</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}

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
