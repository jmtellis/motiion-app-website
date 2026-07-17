"use client";

import type { ProjectHubSummary } from "@/lib/talent-buyers/projects-hub";

import { EmptyState } from "./EmptyState";
import { ProjectCard } from "./ProjectCard";
import { StaggerList } from "./FadeInSection";

import "./projects-hub.css";

export function ProjectGridView({
  projects,
  onCreateProject,
}: {
  projects: ProjectHubSummary[];
  onCreateProject?: () => void;
}) {
  if (!projects.length) {
    return (
      <EmptyState
        variant="dashboard"
        title="No projects yet"
        description="Create a project to start collecting submissions from talent."
        actionLabel="Create project"
        onAction={onCreateProject}
      />
    );
  }

  return (
    <StaggerList className="projects-hub__grid" stagger={0.03}>
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} variant="dashboard" />
      ))}
    </StaggerList>
  );
}
