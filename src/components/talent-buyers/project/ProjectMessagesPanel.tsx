"use client";

import { MessengerShell } from "@/components/messaging/MessengerShell";
import { projectConversations } from "@/lib/talent-buyers/project-workspace-navigation";
import type { InboxConversation } from "@/types/app";
import { useProjectWorkspace } from "./ProjectWorkspaceContext";

export function ProjectMessagesPanel({ conversations, error, initialConversationId }: {
  conversations: InboxConversation[]; error: string | null; initialConversationId?: string;
}) {
  const { projectId, currentUserId, castings, castingWorkflow, activities } = useProjectWorkspace();
  const castingIds = [...castings.map(({ id }) => id), ...(castingWorkflow?.primaryCasting ? [castingWorkflow.primaryCasting.id] : [])];
  const scoped = projectConversations(conversations, projectId, castingIds, activities.map(({ id }) => id));
  return <section className="project-messages"><MessengerShell conversations={scoped} currentUserId={currentUserId} error={error}
    initialConversationId={initialConversationId} variant="dashboard" layout="workspace" title="Messages" hideHeading /></section>;
}
