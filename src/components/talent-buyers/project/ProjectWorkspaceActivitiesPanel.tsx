"use client";

import { useCallback, useEffect, useRef } from "react";

import { AddProjectActivityButton } from "./AddProjectActivityButton";
import { StaggerList } from "@/components/talent-buyers/dashboard/FadeInSection";
import type { ProjectWorkspaceItem } from "@/lib/talent-buyers/project-workspace-items";

import { ProjectActivityCard } from "./ProjectActivityCard";

import "../dashboard/projects-hub.css";
import "./project-workspace.css";

export function ProjectWorkspaceActivitiesPanel({
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
        <h2 className="project-workspace__panel-title">Activities</h2>
        <div className="project-workspace__panel-actions">
          <AddProjectActivityButton projectId={projectId} triggerLabel="Add" />
        </div>
      </header>

      <div className="project-workspace__panel-body">
        {workspaceItems.length === 0 ? (
          <div className="project-workspace__empty">
            <p className="project-workspace__empty-title">No activities yet</p>
            <p className="project-workspace__empty-text">
              Add a casting, class, session, or event to get started.
            </p>
            <AddProjectActivityButton projectId={projectId} triggerLabel="Add an activity" />
          </div>
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
