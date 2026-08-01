"use client";

import Link from "next/link";

import { getProjectTypeLabel, getProjectOverviewSections } from "@/lib/talent-buyers/project-types";
import { projectTabPath } from "@/lib/talent-buyers/project-routes";

import { ProjectOverviewItemsSection } from "./ProjectOverviewItemsSection";
import { ProjectOverviewTalentSection } from "./ProjectOverviewTalentSection";
import { ProjectWorkspaceEmpty } from "./ProjectAddMenuButton";
import { useProjectWorkspace } from "./ProjectWorkspaceContext";

import "./project-workspace.css";

export function ProjectWorkspaceOverviewPanel() {
  const {
    projectId,
    project,
    workspaceItems,
    rosterMembers,
    attachments,
    castingWorkflow,
    selectedItemId,
  } = useProjectWorkspace();
  const typeLabel = getProjectTypeLabel(project.projectType);
  const overviewSections = getProjectOverviewSections(project.projectType);

  const workflow = castingWorkflow ?? {
    primaryCasting: null,
    roles: [],
    candidates: [],
    invitations: [],
    referrals: [],
    externalCandidates: [],
    evaluations: [],
  };

  const hasSummary =
    Boolean(project.location) ||
    Boolean(project.productionCompany) ||
    workspaceItems.length > 0 ||
    rosterMembers.length > 0 ||
    Boolean(workflow.primaryCasting);

  return (
    <div className="project-workspace__panel-body">
      {!hasSummary && overviewSections.length === 0 ? (
        <ProjectWorkspaceEmpty
          title="Project overview"
          description="Add castings, activities, or talent from the Add menu to populate this project."
        />
      ) : (
        <div className="project-workspace__overview">
          {overviewSections.includes("meta") ? (
            <dl className="project-workspace__overview-meta">
              <div>
                <dt>Type</dt>
                <dd>{typeLabel}</dd>
              </div>
              {project.productionCompany ? (
                <div>
                  <dt>Company</dt>
                  <dd>{project.productionCompany}</dd>
                </div>
              ) : null}
              {project.location ? (
                <div>
                  <dt>Location</dt>
                  <dd>{project.location}</dd>
                </div>
              ) : null}
              <div>
                <dt>Status</dt>
                <dd>{project.isDraft ? "Draft" : "Active"}</dd>
              </div>
            </dl>
          ) : null}

          {overviewSections.includes("items") ? (
            <ProjectOverviewItemsSection
              projectId={projectId}
              projectType={project.projectType}
              workspaceItems={workspaceItems}
              selectedItemId={selectedItemId}
            />
          ) : null}

          {overviewSections.includes("talent") ? (
            <ProjectOverviewTalentSection
              projectId={projectId}
              rosterMembers={rosterMembers}
              variant="roster"
            />
          ) : null}

          <div className="project-workspace__overview-stats">
            <Link href={projectTabPath(projectId, "files")} className="project-workspace__overview-stat">
              <span className="project-workspace__overview-stat-value">{attachments.length}</span>
              <span className="project-workspace__overview-stat-label">Files</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
