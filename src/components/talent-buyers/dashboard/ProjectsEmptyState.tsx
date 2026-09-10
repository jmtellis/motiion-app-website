"use client";

import { useRouter } from "next/navigation";

import {
  BUYER_CREATE_INTENT_OPTIONS,
  createIntentPath,
} from "@/lib/talent-buyers/create-intent";

import type { ProjectsViewMode } from "./ProjectsViewModeContext";
import "./buyer-empty.css";

function FocusSkeletonCard() {
  return (
    <div className="projects-hub__focus-empty-card">
      <span className="buyer-empty__bone buyer-empty__bone--chip" />
      <div className="projects-hub__focus-empty-card-body" aria-hidden>
        <span className="buyer-empty__bone buyer-empty__bone--type" />
        <span className="buyer-empty__bone buyer-empty__bone--title" />
        <div className="buyer-empty__card-meta">
          <div className="buyer-empty__card-meta-col">
            <span className="buyer-empty__bone buyer-empty__bone--label" />
            <span className="buyer-empty__bone buyer-empty__bone--value" />
          </div>
          <div className="buyer-empty__card-meta-col">
            <span className="buyer-empty__bone buyer-empty__bone--label" />
            <span className="buyer-empty__bone buyer-empty__bone--value" />
          </div>
        </div>
      </div>
    </div>
  );
}

function BrowseEmptyState() {
  const router = useRouter();

  return (
    <div className="buyer-empty">
      <ul className="buyer-empty__grid" aria-label="Create a casting, event, class, or session">
        {BUYER_CREATE_INTENT_OPTIONS.map((option) => (
          <li key={option.value}>
            <button
              type="button"
              className="buyer-empty__card buyer-empty__card--interactive"
              onClick={() => router.push(createIntentPath(option.value))}
              aria-label={`Start a ${option.label.toLowerCase()}`}
            >
              <div className="buyer-empty__card-media" aria-hidden>
                <span className="buyer-empty__bone buyer-empty__bone--chip" />
              </div>
              <div className="buyer-empty__card-body">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                  {option.label}
                </span>
                <p className="mt-2 text-sm text-white/55">{option.description}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FocusEmptyState({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <div className="buyer-empty projects-hub__empty--focus">
      <div className="projects-hub__focus-empty" aria-label="Start your next project">
        <div className="projects-hub__focus-empty-stage">
          <div className="projects-hub__focus-empty-track">
            <div className="projects-hub__focus-empty-slide projects-hub__focus-empty-slide--flank" aria-hidden>
              <FocusSkeletonCard />
            </div>

            <div className="projects-hub__focus-empty-slide projects-hub__focus-empty-slide--hero">
              <button
                type="button"
                className="projects-hub__focus-empty-card projects-hub__focus-empty-card--cta"
                onClick={onCreateProject}
              >
                <span className="projects-hub__focus-empty-cta">
                  <span className="projects-hub__focus-empty-headline">Create something</span>
                  <span className="projects-hub__focus-empty-copy">
                    Start a casting, event, class, or session — one object, one workspace.
                  </span>
                  <span className="buyer-chrome-bar__cta projects-hub__focus-empty-button">
                    Create
                  </span>
                </span>
              </button>
            </div>

            <div className="projects-hub__focus-empty-slide projects-hub__focus-empty-slide--flank" aria-hidden>
              <FocusSkeletonCard />
            </div>
          </div>
        </div>

        <div className="projects-hub__focus-empty-footer" aria-hidden>
          <div className="projects-hub__focus-empty-footer-copy">
            <span className="buyer-empty__bone projects-hub__focus-empty-footer-title" />
            <span className="buyer-empty__bone projects-hub__focus-empty-footer-meta" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectsEmptyState({
  onCreateProject,
  viewMode = "browse",
}: {
  onCreateProject: () => void;
  viewMode?: ProjectsViewMode;
}) {
  if (viewMode === "focus") {
    return <FocusEmptyState onCreateProject={onCreateProject} />;
  }

  return <BrowseEmptyState />;
}
