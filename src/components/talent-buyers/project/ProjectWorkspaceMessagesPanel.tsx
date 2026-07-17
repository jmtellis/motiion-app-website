"use client";

import { useMemo, useState } from "react";

import { MessengerShell } from "@/components/messaging/MessengerShell";
import {
  conversationGroupChips,
  filterProjectConversations,
} from "@/lib/talent-buyers/project-workspace-items";
import type { ProjectWorkspaceItem } from "@/lib/talent-buyers/project-workspace-items";
import type { InboxConversation } from "@/types/app";

import "./project-workspace.css";

/**
 * v1 filters conversations by context_title matching project/activity titles.
 * message_threads.project_id exists in schema but is unused — follow-up migration
 * can wire true project/thread grouping.
 */
export function ProjectWorkspaceMessagesPanel({
  projectId,
  projectTitle,
  workspaceItems,
  conversations,
  currentUserId,
  inboxError,
}: {
  projectId: string;
  projectTitle: string;
  workspaceItems: ProjectWorkspaceItem[];
  conversations: InboxConversation[];
  currentUserId: string;
  inboxError: string | null;
}) {
  const [groupFilter, setGroupFilter] = useState<string | null>(null);

  const projectConversations = useMemo(
    () => filterProjectConversations(conversations, projectTitle, workspaceItems, projectId),
    [conversations, projectId, projectTitle, workspaceItems],
  );

  const groupChips = useMemo(() => conversationGroupChips(projectConversations), [projectConversations]);

  const filteredConversations = useMemo(() => {
    if (!groupFilter) return projectConversations;
    return projectConversations.filter((c) => c.context_title?.trim() === groupFilter);
  }, [groupFilter, projectConversations]);

  return (
    <div className="project-workspace__messages flex min-h-0 flex-1 flex-col">
      {groupChips.length > 0 ? (
        <div className="project-workspace__messages-filters" role="tablist" aria-label="Message groups">
          <button
            type="button"
            role="tab"
            className={`project-workspace__chip ${groupFilter === null ? "project-workspace__chip--active" : ""}`}
            onClick={() => setGroupFilter(null)}
            aria-selected={groupFilter === null}
          >
            All
          </button>
          {groupChips.map((chip) => (
            <button
              key={chip}
              type="button"
              role="tab"
              className={`project-workspace__chip ${groupFilter === chip ? "project-workspace__chip--active" : ""}`}
              onClick={() => setGroupFilter(chip)}
              aria-selected={groupFilter === chip}
            >
              {chip}
            </button>
          ))}
        </div>
      ) : null}

      <div className="project-workspace__messenger">
        {projectConversations.length === 0 && !inboxError ? (
          <div className="project-workspace__empty">
            <p className="project-workspace__empty-title">No project messages</p>
            <p className="project-workspace__empty-text">
              Conversations linked to this project or its activities will appear here.
            </p>
          </div>
        ) : (
          <MessengerShell
            conversations={filteredConversations}
            currentUserId={currentUserId}
            error={inboxError}
            variant="dashboard"
            layout="workspace"
            projectFilterTitle={groupFilter}
          />
        )}
      </div>
    </div>
  );
}
