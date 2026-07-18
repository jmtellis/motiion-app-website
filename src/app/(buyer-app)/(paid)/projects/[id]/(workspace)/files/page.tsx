"use client";

import { useProjectWorkspace } from "@/components/talent-buyers/project/ProjectWorkspaceContext";
import { ProjectWorkspaceFilesPanel } from "@/components/talent-buyers/project/ProjectWorkspaceFilesPanel";

export default function ProjectFilesPage() {
  const { projectId, project, attachments } = useProjectWorkspace();
  return (
    <ProjectWorkspaceFilesPanel
      projectId={projectId}
      projectType={project.projectType}
      initialAttachments={attachments}
    />
  );
}
