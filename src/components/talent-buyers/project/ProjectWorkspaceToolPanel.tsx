"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { getNormalizedProjectType } from "@/lib/talent-buyers/project-types";
import { getWorkspaceEmptyState } from "@/lib/talent-buyers/project-quick-actions";
import { projectTabPath, projectWorkspacePath } from "@/lib/talent-buyers/project-routes";
import { getProjectWorkspaceConfig } from "@/lib/talent-buyers/project-workspace-config";

import { CastingWorkspacePanel } from "@/components/talent-buyers/casting/CastingWorkspacePanel";

import { ProjectWorkspaceEmpty } from "./ProjectAddMenuButton";
import { CreateCastingModal } from "./CreateCastingModal";
import { CreateScheduledActivityModal } from "./CreateScheduledActivityModal";
import { useProjectWorkspace } from "./ProjectWorkspaceContext";

import "./project-workspace.css";

export function ProjectWorkspaceToolPanel({ workspaceTab }: { workspaceTab: string }) {
  const router = useRouter();
  const { projectId, project } = useProjectWorkspace();
  const config = getProjectWorkspaceConfig(project.projectType);
  const navItem = config.workspaceItems.find((item) => item.id === workspaceTab);
  const empty = getWorkspaceEmptyState(project.projectType, workspaceTab);

  const [castingOpen, setCastingOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);

  if (getNormalizedProjectType(project.projectType) === "casting") {
    return <CastingWorkspacePanel workspaceTab={workspaceTab} />;
  }

  const title = navItem?.label ?? workspaceTab.replace(/-/g, " ");
  const description =
    navItem?.description ?? `Tools for your ${config.label.toLowerCase()} workspace.`;

  function handlePrimaryAction() {
    const actionId = empty.actionId;
    if (actionId === "timeline-item") {
      setTimelineOpen(true);
      return;
    }
    if (actionId === "casting") {
      setCastingOpen(true);
      return;
    }
    if (actionId === "add-talent") {
      router.push(`/talent?projectId=${projectId}`);
      return;
    }
    if (actionId === "invite-talent") {
      router.push(projectWorkspacePath(projectId, "talent-search") + "?view=invitations");
      return;
    }
    if (actionId === "review-candidates") {
      router.push(projectWorkspacePath(projectId, "review"));
      return;
    }
    if (actionId === "navigate-files") {
      router.push(projectTabPath(projectId, "files"));
    }
  }

  const hasWiredAction = Boolean(empty.actionId);

  return (
    <>
      <header className="project-workspace__panel-header">
        <div>
          <h2 className="project-workspace__panel-title">{title}</h2>
          <p className="project-workspace__panel-description">{description}</p>
        </div>
        {hasWiredAction ? (
          <div className="project-workspace__panel-actions">
            <button type="button" className="bd-btn-accent" onClick={handlePrimaryAction}>
              {empty.actionLabel}
            </button>
          </div>
        ) : null}
      </header>

      <div className="project-workspace__panel-body">
        <ProjectWorkspaceEmpty
          title={empty.title}
          description={empty.description}
          actionLabel={hasWiredAction ? empty.actionLabel : undefined}
          onAction={hasWiredAction ? handlePrimaryAction : undefined}
        />
      </div>

      <CreateCastingModal projectId={projectId} open={castingOpen} onClose={() => setCastingOpen(false)} />

      {timelineOpen ? (
        <CreateScheduledActivityModal
          projectId={projectId}
          activityType="session"
          open={timelineOpen}
          onClose={() => setTimelineOpen(false)}
        />
      ) : null}
    </>
  );
}
