"use client";

import { useRouter } from "next/navigation";

import { projectCreatePath } from "@/lib/talent-buyers/project-create-registry";
import type { ProjectType } from "@/lib/talent-buyers/project-types";

import type { ProjectsViewMode } from "./ProjectsViewModeContext";
import "./buyer-empty.css";

const EXAMPLE_PROJECTS: Array<{ type: ProjectType; key: string }> = [
  { type: "casting", key: "casting" },
  { type: "event", key: "event" },
];

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
      <ul className="buyer-empty__grid" aria-label="Example project layout">
        {EXAMPLE_PROJECTS.map((example) => (
          <li key={example.key}>
            <button
              type="button"
              className="buyer-empty__card buyer-empty__card--interactive"
              onClick={() => router.push(projectCreatePath(example.type))}
              aria-label={`Start a ${example.type.replaceAll("_", " ")} project`}
            >
              <div className="buyer-empty__card-media" aria-hidden>
                <span className="buyer-empty__bone buyer-empty__bone--chip" />
              </div>
              <div className="buyer-empty__card-body" aria-hidden>
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
                  <span className="projects-hub__focus-empty-headline">Your next project</span>
                  <span className="projects-hub__focus-empty-copy">
                    Cast it, staff it, or run the room — give it a name and bring it into focus.
                  </span>
                  <span className="buyer-chrome-bar__cta projects-hub__focus-empty-button">
                    Create project
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
