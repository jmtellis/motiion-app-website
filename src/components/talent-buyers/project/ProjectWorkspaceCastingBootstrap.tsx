import { fetchCastingWorkflowData } from "@/lib/talent-buyers/casting/casting-workflow-data";
import type { ProjectAttachment } from "@/types/project";

import { ProjectWorkspaceCastingWorkflowBridge } from "./ProjectWorkspaceContext";

/**
 * Streams authorized casting data after the shell paints. Reads never migrate data.
 */
export async function ProjectWorkspaceCastingBootstrap({
  projectId,
  userId,
  enabled,
  initialAttachments,
  children,
}: {
  projectId: string;
  userId: string;
  enabled: boolean;
  initialAttachments: ProjectAttachment[];
  children: React.ReactNode;
}) {
  if (!enabled) {
    return children;
  }

  const castingWorkflow = await fetchCastingWorkflowData(projectId, userId);

  return (
    <ProjectWorkspaceCastingWorkflowBridge castingWorkflow={castingWorkflow} attachments={initialAttachments}>
      {children}
    </ProjectWorkspaceCastingWorkflowBridge>
  );
}
