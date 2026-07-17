"use client";

import { useCallback, useEffect, useRef } from "react";

import { AddProjectActivityButton } from "./AddProjectActivityButton";
import { ProjectWorkspaceEmpty } from "./ProjectAddMenuButton";
import { StaggerList } from "@/components/talent-buyers/dashboard/FadeInSection";
import type { ProjectWorkspaceItem } from "@/lib/talent-buyers/project-workspace-items";

import { ProjectActivityCard } from "./ProjectActivityCard";

import "../dashboard/projects-hub.css";
import "./project-workspace.css";

export function ProjectWorkspaceTimelinePanel({
  projectId,
  workspaceItems,
  selectedItemId,
}: {
  projectId: string;
  workspaceItems: ProjectWorkspaceItem[];
  selectedItemId: string | null;
}) {
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  const setCardRef = useCallback((id: string) => {
    return (node: HTMLElement | null) => {
      if (node) cardRefs.current.set(id, node);
      else cardRefs.current.delete(id);
    };
  }, []);

  useEffect(() => {
    if (!selectedItemId) return;
    const node = cardRefs.current.get(selectedItemId);
    node?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedItemId]);

  return (
    <>
      <header className="project-workspace__panel-header">
        <div>
          <h2 className="project-workspace__panel-title">Timeline</h2>
          <p className="project-workspace__panel-description">
            Meetings, deadlines, rehearsals, fittings, auditions, and other activities.
          </p>
        </div>
        <div className="project-workspace__panel-actions">
          <AddProjectActivityButton projectId={projectId} triggerLabel="Add timeline item" />
        </div>
      </header>

      <div className="project-workspace__panel-body">
        {workspaceItems.length === 0 ? (
          <ProjectWorkspaceEmpty
            title="No timeline items yet"
            description="Add a rehearsal, meeting, deadline, event, or other activity to begin organizing this project."
          >
            <AddProjectActivityButton projectId={projectId} triggerLabel="Add timeline item" />
          </ProjectWorkspaceEmpty>
        ) : (
          <StaggerList className="projects-hub__grid">
            {workspaceItems.map((item) => (
              <ProjectActivityCard
                key={item.id}
                item={item}
                cardRef={setCardRef(item.id)}
                highlighted={selectedItemId === item.id}
              />
            ))}
          </StaggerList>
        )}
      </div>
    </>
  );
}
