"use client";

import { AnimatePresence, motion } from "motion/react";
import { MoreHorizontal, Plus, Search } from "lucide-react";

import { MarketingScene, type MarketingSceneProps } from "@/components/marketing/MarketingScene";
import { MockArtboard } from "@/components/marketing/MockArtboard";
import { useSceneTimeline } from "@/components/marketing/useSceneTimeline";
import { demoDancers } from "@/lib/demo/dancers";
import { demoCollections } from "@/lib/demo/projects";

const EASE = [0.22, 1, 0.36, 1] as const;
const ROSTER_ID = "col-tour-favorites";

const STEPS = [
  { at: 0, set: "hub" },
  { at: 1400, set: "select" },
  { at: 2200, set: "detail" },
  { at: 5200, set: "hold" },
];

function membersFor(collectionId: string) {
  const collection = demoCollections.find((item) => item.id === collectionId);
  if (!collection) return [];
  return collection.dancerIds
    .map((id) => demoDancers.find((dancer) => dancer.id === id))
    .filter((dancer): dancer is (typeof demoDancers)[number] => Boolean(dancer));
}

function previewFor(collectionId: string) {
  const members = membersFor(collectionId);
  return Array.from({ length: 4 }, (_, index) => members[index] ?? null);
}

export function CompareScene({ play, reduceMotion = false, playKey }: MarketingSceneProps) {
  const beat = useSceneTimeline(STEPS, { play, reduceMotion, restartKey: playKey });
  const collections = demoCollections.slice(0, 4);
  const active = collections.find((item) => item.id === ROSTER_ID) ?? collections[0];
  const showDetail = beat === "detail" || beat === "hold" || reduceMotion;
  const highlight = beat === "select" || showDetail;
  const members = membersFor(ROSTER_ID);

  return (
    <MarketingScene>
      <MockArtboard>
        <header className="md-mock__chrome md-mock__chrome--stack">
          <div className="md-mock__segment" aria-hidden>
            <span className="md-mock__segment-item">Browse</span>
            <span className="md-mock__segment-item md-mock__segment-item--active">Roster</span>
          </div>
          <div className="md-mock__chrome-row">
            <p className="md-mock__title">{showDetail && active ? active.name : "Roster"}</p>
            <div className="md-mock__chrome-end">
              {!showDetail ? (
                <span className="md-mock__btn md-mock__btn--sm">
                  <Plus className="size-3.5" aria-hidden />
                  Create roster
                </span>
              ) : (
                <span className="md-mock__btn md-mock__btn--sm">
                  <Plus className="size-3.5" aria-hidden />
                  Add talent
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="md-mock__body">
          <AnimatePresence mode="wait" initial={false}>
            {showDetail && active ? (
              <motion.div
                key="detail"
                className="md-mock__roster-detail"
                initial={reduceMotion ? false : { opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <div className="md-mock__roster-heading">
                  <div>
                    <p>{active.note}</p>
                    <span className="md-mock__chip">
                      {members.length} {members.length === 1 ? "person" : "people"}
                    </span>
                  </div>
                  <span className="md-mock__search-field">
                    <Search className="size-3.5" aria-hidden />
                    Search roster
                  </span>
                </div>
                <div className="md-mock__member-grid">
                  {members.map((dancer, index) => (
                    <motion.article
                      key={dancer.id}
                      className="md-mock__member-card"
                      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: index * 0.06, ease: EASE }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={dancer.imageUrl} alt="" />
                      <div>
                        <strong>{dancer.name}</strong>
                        <span>{dancer.location}</span>
                      </div>
                    </motion.article>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="hub"
                className="md-mock__hub-grid"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                {collections.map((collection) => (
                  <article
                    key={collection.id}
                    className={`md-mock__collection-card${
                      highlight && collection.id === ROSTER_ID
                        ? " md-mock__collection-card--highlight"
                        : ""
                    }`}
                  >
                    <div className="md-mock__collection-preview">
                      {previewFor(collection.id).map((dancer, index) =>
                        dancer ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={`${collection.id}-${dancer.id}`} src={dancer.imageUrl} alt="" />
                        ) : (
                          <span key={`${collection.id}-empty-${index}`} />
                        ),
                      )}
                    </div>
                    <div className="md-mock__collection-body">
                      <div className="md-mock__collection-title-row">
                        <h3>{collection.name}</h3>
                        <MoreHorizontal className="size-4" aria-hidden />
                      </div>
                      <p>
                        {collection.dancerIds.length} people
                      </p>
                      <p className="md-mock__collection-note">{collection.note}</p>
                    </div>
                  </article>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </MockArtboard>
    </MarketingScene>
  );
}
