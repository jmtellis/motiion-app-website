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
    <>
      <header className="project-workspace__panel-header">
        <div>
          <h2 className="project-workspace__panel-title">Talent</h2>
          <p className="project-workspace__panel-description">
            {isCastingProject
              ? "Everyone connected to this casting project."
              : "Project roster and attached talent."}
          </p>
        </div>
      </header>

      <div className="project-workspace__panel-body">
        <ProjectOverviewTalentSection
          projectId={projectId}
          rosterMembers={rosterMembers}
          variant={isCastingProject ? "casting-candidates" : "roster"}
        />
      </div>
    </>
  );
}
