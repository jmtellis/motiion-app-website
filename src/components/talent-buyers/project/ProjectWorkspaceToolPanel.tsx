"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { getNormalizedProjectType } from "@/lib/talent-buyers/project-types";
import { getWorkspaceEmptyState } from "@/lib/talent-buyers/project-quick-actions";
import { projectTabPath, projectWorkspacePath } from "@/lib/talent-buyers/project-routes";

import { CastingWorkspacePanel } from "@/components/talent-buyers/casting/CastingWorkspacePanel";

import { ProjectWorkspaceEmpty } from "./ProjectAddMenuButton";
import { CreateCastingModal } from "./CreateCastingModal";
import { CreateScheduledActivityModal } from "./CreateScheduledActivityModal";
import { useProjectWorkspace } from "./ProjectWorkspaceContext";

import "./project-workspace.css";

export function ProjectWorkspaceToolPanel({ workspaceTab }: { workspaceTab: string }) {
  const router = useRouter();
  const { projectId, project } = useProjectWorkspace();
  const empty = getWorkspaceEmptyState(project.projectType, workspaceTab);

  const [castingOpen, setCastingOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);

  if (getNormalizedProjectType(project.projectType) === "casting") {
    return <CastingWorkspacePanel workspaceTab={workspaceTab} />;
  }

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
    if (actionId === "create-showcase-event") {
      router.push(`/calendar/new?type=event&projectId=${projectId}`);
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
      {hasWiredAction ? (
        <header className="project-workspace__panel-header project-workspace__panel-header--actions">
          <div className="project-workspace__panel-actions">
            <button type="button" className="bd-btn-accent" onClick={handlePrimaryAction}>
              {empty.actionLabel}
            </button>
          </div>
        </header>
      ) : null}

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
