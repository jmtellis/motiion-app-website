"use client";

import { useCallback, useEffect, useRef } from "react";

import { StaggerList } from "@/components/talent-buyers/dashboard/FadeInSection";
import { getNormalizedProjectType } from "@/lib/talent-buyers/project-types";
import type { ProjectWorkspaceItem } from "@/lib/talent-buyers/project-workspace-items";

import { AddProjectActivityButton } from "./AddProjectActivityButton";
import { ProjectAddMenuButton } from "./ProjectAddMenuButton";
import { ProjectActivityCard } from "./ProjectActivityCard";
import { ProjectWorkspaceEmpty } from "./ProjectAddMenuButton";

import "../dashboard/projects-hub.css";
import "./project-workspace.css";

export function ProjectOverviewItemsSection({
  projectId,
  projectType,
  workspaceItems,
  selectedItemId,
}: {
  projectId: string;
  projectType: string | null;
  workspaceItems: ProjectWorkspaceItem[];
  selectedItemId: string | null;
}) {
  const isEventProject = getNormalizedProjectType(projectType) === "event";
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

  const castingItems = workspaceItems.filter((item) => item.kind === "casting");
  const activityItems = workspaceItems.filter((item) => item.kind !== "casting");
  const groups = [
    { label: "Castings", items: castingItems },
    { label: "Activities", items: activityItems },
  ].filter((group) => group.items.length > 0);

  return (
    <section className="project-workspace__overview-section" aria-labelledby="overview-items-heading">
      <div className="project-workspace__overview-section-header">
        <div>
          <h3 id="overview-items-heading" className="project-workspace__overview-section-title">
            {isEventProject ? "Showcase events & activities" : "Castings & activities"}
          </h3>
          <p className="project-workspace__overview-section-description">
            {isEventProject
              ? "Add a showcase Event to invite leads, sell tickets, and run check-in. Open that event to manage the Leads tab."
              : "Castings, classes, sessions, and events attached to this project."}
          </p>
        </div>
        {isEventProject ? (
          <AddProjectActivityButton
            projectId={projectId}
            triggerClassName="bd-btn-secondary text-sm"
            triggerLabel="Add"
          />
        ) : (
          <ProjectAddMenuButton
            projectId={projectId}
            projectType={projectType}
            triggerClassName="bd-btn-secondary text-sm"
          />
        )}
      </div>

      {workspaceItems.length === 0 ? (
        <ProjectWorkspaceEmpty
          title={isEventProject ? "No showcase event yet" : "No castings or activities yet"}
          description={
            isEventProject
              ? "Create a Showcase event to invite Motiion members as leads, manage guests, and run check-in."
              : "Add a casting, class, session, or event to begin organizing this project."
          }
        >
          {isEventProject ? (
            <AddProjectActivityButton projectId={projectId} triggerLabel="Add showcase event" />
          ) : (
            <ProjectAddMenuButton projectId={projectId} projectType={projectType} />
          )}
        </ProjectWorkspaceEmpty>
      ) : groups.length === 1 ? (
        <StaggerList className="projects-hub__grid">
          {groups[0].items.map((item) => (
            <ProjectActivityCard
              key={item.id}
              item={item}
              cardRef={setCardRef(item.id)}
              highlighted={selectedItemId === item.id}
            />
          ))}
        </StaggerList>
      ) : (
        <div className="project-workspace__overview-item-groups">
          {groups.map((group) => (
            <div key={group.label} className="project-workspace__overview-item-group">
              <h4 className="project-workspace__overview-item-group-title">{group.label}</h4>
              <StaggerList className="projects-hub__grid">
                {group.items.map((item) => (
                  <ProjectActivityCard
                    key={item.id}
                    item={item}
                    cardRef={setCardRef(item.id)}
                    highlighted={selectedItemId === item.id}
                  />
                ))}
              </StaggerList>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
