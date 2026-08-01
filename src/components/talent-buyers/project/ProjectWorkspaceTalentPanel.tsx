"use client";

import { ProjectOverviewTalentSection } from "./ProjectOverviewTalentSection";
import type { ProjectRosterMember } from "@/lib/talent-buyers/project-roster";

import { useProjectWorkspace } from "./ProjectWorkspaceContext";

import "./project-workspace.css";

export function ProjectWorkspaceTalentPanel({
  projectId,
  rosterMembers,
}: {
  projectId: string;
  rosterMembers: ProjectRosterMember[];
}) {
  const { project } = useProjectWorkspace();
  const isCastingProject = project.projectType === "casting";

  return (
    <div className="project-workspace__panel-body">
      <ProjectOverviewTalentSection
        projectId={projectId}
        rosterMembers={rosterMembers}
        variant={isCastingProject ? "casting-candidates" : "roster"}
      />
    </div>
  );
}
