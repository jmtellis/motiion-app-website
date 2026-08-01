"use client";

import type { ProjectAttachment } from "@/types/project";

import { ProjectAttachmentsManager } from "./ProjectAttachmentsManager";

import "./project-workspace.css";

export function ProjectWorkspaceFilesPanel({
  projectId,
  projectType,
  initialAttachments,
}: {
  projectId: string;
  projectType?: string | null;
  initialAttachments: ProjectAttachment[];
}) {
  return (
    <div className="project-workspace__panel-body">
      <ProjectAttachmentsManager
        projectId={projectId}
        projectType={projectType}
        initialAttachments={initialAttachments}
      />
    </div>
  );
}
