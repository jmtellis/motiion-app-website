import { migrateLegacyCastingAttachmentsIfNeeded } from "@/app/(buyer-app)/(paid)/projects/project-media-actions";
import { fetchCastingWorkflowData } from "@/lib/talent-buyers/casting/casting-workflow-data";
import type { ProjectAttachment } from "@/types/project";

import { ProjectWorkspaceCastingWorkflowBridge } from "./ProjectWorkspaceContext";

/**
 * Streams casting workflow (+ optional attachment migration) after the workspace shell paints.
 */
export async function ProjectWorkspaceCastingBootstrap({
  projectId,
  userId,
  enabled,
  initialAttachments,
  needsAttachmentMigration,
  children,
}: {
  projectId: string;
  userId: string;
  enabled: boolean;
  initialAttachments: ProjectAttachment[];
  needsAttachmentMigration: boolean;
  children: React.ReactNode;
}) {
  if (!enabled) {
    return children;
  }

  const [castingWorkflow, migrated] = await Promise.all([
    fetchCastingWorkflowData(projectId, userId),
    needsAttachmentMigration
      ? migrateLegacyCastingAttachmentsIfNeeded(projectId)
      : Promise.resolve(null),
  ]);

  const attachments =
    migrated && migrated.attachments.length ? migrated.attachments : initialAttachments;

  return (
    <ProjectWorkspaceCastingWorkflowBridge castingWorkflow={castingWorkflow} attachments={attachments}>
      {children}
    </ProjectWorkspaceCastingWorkflowBridge>
  );
}
