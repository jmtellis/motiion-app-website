"use client";

import type { ProjectHubSummary } from "@/lib/talent-buyers/projects-hub";

import { ProjectCard } from "./ProjectCard";
import { StaggerList } from "./FadeInSection";

import "./projects-hub.css";

export function ProjectGridView({ projects }: { projects: ProjectHubSummary[] }) {
  if (!projects.length) return null;

  return (
    <StaggerList className="projects-hub__grid" stagger={0.03}>
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} variant="dashboard" />
      ))}
    </StaggerList>
  );
}
