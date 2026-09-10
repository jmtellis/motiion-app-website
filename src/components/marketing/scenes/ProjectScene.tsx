"use client";

import { AnimatePresence, motion } from "motion/react";
import { FileText, Plus } from "lucide-react";

import { MarketingScene, type MarketingSceneProps } from "@/components/marketing/MarketingScene";
import { MockArtboard } from "@/components/marketing/MockArtboard";
import { useSceneTimeline } from "@/components/marketing/useSceneTimeline";
import { demoDancers } from "@/lib/demo/dancers";
import { demoProjects } from "@/lib/demo/projects";

const EASE = [0.22, 1, 0.36, 1] as const;

const STEPS = [
  { at: 0, set: "hub" },
  { at: 1400, set: "select" },
  { at: 2200, set: "workspace" },
  { at: 3600, set: "files" },
  { at: 5600, set: "hold" },
];

const HUB_TABS = ["All Projects", "Active", "Archived"];
const WORKSPACE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "files", label: "Files", badge: 4 },
  { id: "tour-dates", label: "Tour Dates" },
  { id: "cities", label: "Cities" },
  { id: "rehearsals", label: "Rehearsals" },
  { id: "travel", label: "Travel" },
];

const FILES = [
  { title: "Casting brief.pdf", kind: "pdf" as const, url: null },
  {
    title: "Look references.jpg",
    kind: "image" as const,
    url: demoDancers[0]?.imageUrl ?? null,
  },
  { title: "Schedule.xlsx", kind: "sheet" as const, url: null },
  {
    title: "Wardrobe notes.jpg",
    kind: "image" as const,
    url: demoDancers[1]?.imageUrl ?? null,
  },
];

export function ProjectScene({ play, reduceMotion = false, playKey }: MarketingSceneProps) {
  const beat = useSceneTimeline(STEPS, { play, reduceMotion, restartKey: playKey });
  const projects = demoProjects.slice(0, 4);
  const active = projects[0];
  const showWorkspace = beat === "workspace" || beat === "files" || beat === "hold" || reduceMotion;
  const showFiles = beat === "files" || beat === "hold" || reduceMotion;
  const highlight = beat === "select" || showWorkspace;
  const activeTab = showFiles ? "files" : "overview";

  return (
    <MarketingScene>
      <MockArtboard>
        <header className="md-mock__chrome md-mock__chrome--stack">
          {!showWorkspace ? (
            <>
              <div className="md-mock__segment" aria-hidden>
                <span className="md-mock__segment-item">Focus</span>
                <span className="md-mock__segment-item md-mock__segment-item--active">Browse</span>
              </div>
              <div className="md-mock__chrome-row">
                <div className="md-mock__underline-tabs">
                  {HUB_TABS.map((tab, index) => (
                    <span
                      key={tab}
                      className={`md-mock__underline-tab${index === 0 ? " md-mock__underline-tab--active" : ""}`}
                    >
                      {tab}
                    </span>
                  ))}
                </div>
                <span className="md-mock__btn md-mock__btn--sm">
                  <Plus className="size-3.5" aria-hidden />
                  Create
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="md-mock__chrome-row">
                <div className="md-mock__project-chrome-identity">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={active?.coverUrl} alt="" />
                  <div>
                    <p className="md-mock__title">{active?.title}</p>
                    <p className="md-mock__eyebrow">{active?.type}</p>
                  </div>
                </div>
              </div>
              <nav className="md-mock__underline-tabs md-mock__underline-tabs--workspace">
                {WORKSPACE_TABS.map((tab) => (
                  <span
                    key={tab.id}
                    className={`md-mock__underline-tab${
                      tab.id === activeTab ? " md-mock__underline-tab--active" : ""
                    }`}
                  >
                    {tab.label}
                    {tab.badge ? <span className="md-mock__badge">{tab.badge}</span> : null}
                  </span>
                ))}
              </nav>
            </>
          )}
        </header>

        <div className="md-mock__body">
          <AnimatePresence mode="wait" initial={false}>
            {showWorkspace && active ? (
              <motion.div
                key="workspace"
                className="md-mock__workspace"
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                {!showFiles ? (
                  <>
                    <dl className="md-mock__meta-row">
                      <div>
                        <dt>Type</dt>
                        <dd>{active.type}</dd>
                      </div>
                      <div>
                        <dt>Location</dt>
                        <dd>Los Angeles, CA</dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>{active.status}</dd>
                      </div>
                      <div>
                        <dt>Talent</dt>
                        <dd>{active.talentCount}</dd>
                      </div>
                    </dl>
                    <div className="md-mock__project-cover-wide">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={active.coverUrl} alt="" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="md-mock__files">
                      {FILES.map((file, index) => (
                        <motion.div
                          key={file.title}
                          className="md-mock__file"
                          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: index * 0.06, ease: EASE }}
                        >
                          <div className="md-mock__file-thumb">
                            {file.kind === "image" && file.url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={file.url} alt="" />
                            ) : (
                              <FileText className="size-6" aria-hidden />
                            )}
                          </div>
                          <p>{file.title}</p>
                        </motion.div>
                      ))}
                      <div className="md-mock__file md-mock__file--add">
                        <div className="md-mock__file-thumb">
                          <Plus className="size-5" aria-hidden />
                        </div>
                        <p>Add attachment</p>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="hub"
                className="md-mock__project-grid"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                {projects.map((project, index) => (
                  <article
                    key={project.id}
                    className={`md-mock__project-card${
                      highlight && index === 0 ? " md-mock__project-card--highlight" : ""
                    }`}
                  >
                    <div className="md-mock__project-card-media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={project.coverUrl} alt="" />
                      <span>{project.type}</span>
                    </div>
                    <div className="md-mock__project-card-body">
                      <h3>{project.title}</h3>
                      <p>Edited 2h ago</p>
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
