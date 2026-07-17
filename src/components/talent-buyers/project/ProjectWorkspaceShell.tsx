"use client";

import type { ReactNode } from "react";

import { useRegisterBuyerChrome } from "@/components/talent-buyers/dashboard/BuyerPageChromeContext";
import { getProjectTypeLabel } from "@/lib/talent-buyers/project-types";

import { ProjectAddMenuButton } from "./ProjectAddMenuButton";
import { useProjectWorkspace } from "./ProjectWorkspaceContext";
import { ProjectWorkspaceLeftRail } from "./ProjectWorkspaceLeftRail";

import "./project-workspace.css";

export function ProjectWorkspaceShell({ children }: { children: ReactNode }) {
  const { projectId, project, attachments } = useProjectWorkspace();
  const isCastingProject = project.projectType === "casting";

  useRegisterBuyerChrome({
    breadcrumbs: [
      { label: "Projects", href: "/projects" },
      { label: getProjectTypeLabel(project.projectType) },
    ],
    end: isCastingProject ? null : (
      <ProjectAddMenuButton projectId={projectId} projectType={project.projectType} />
    ),
    revision: `${projectId}:${project.projectType ?? ""}`,
  });

  return (
    <div className="project-workspace">
      <ProjectWorkspaceLeftRail project={project} fileCount={attachments.length} />
      <section className="project-workspace__panel" aria-label="Project content">
        {children}
      </section>
    </div>
  );
}
