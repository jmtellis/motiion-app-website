"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import type { ProjectRosterMember } from "@/lib/talent-buyers/project-roster";
import {
  buildProjectWorkspaceItems,
  type ProjectWorkspaceItem,
} from "@/lib/talent-buyers/project-workspace-items";
import type { ProjectCastingSummary } from "@/lib/talent-buyers/castings";
import type { ProjectActivitySummary } from "@/lib/talent-buyers/project-activities";
import type { CastingWorkflowData } from "@/lib/talent-buyers/casting/casting-types";
import type { ProjectAttachment } from "@/types/project";

import type { ProjectWorkspaceMeta } from "./ProjectWorkspaceLeftRail";

export type ProjectWorkspaceData = {
  projectId: string;
  project: ProjectWorkspaceMeta;
  castings: ProjectCastingSummary[];
  activities: ProjectActivitySummary[];
  rosterMembers: ProjectRosterMember[];
  currentUserId: string;
  attachments: ProjectAttachment[];
  castingWorkflow: CastingWorkflowData | null;
  workspaceItems: ProjectWorkspaceItem[];
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
};

const ProjectWorkspaceContext = createContext<ProjectWorkspaceData | null>(null);

export function ProjectWorkspaceProvider({
  projectId,
  project,
  castings,
  activities,
  rosterMembers,
  currentUserId,
  attachments,
  castingWorkflow = null,
  children,
}: {
  projectId: string;
  project: ProjectWorkspaceMeta;
  castings: ProjectCastingSummary[];
  activities: ProjectActivitySummary[];
  rosterMembers: ProjectRosterMember[];
  currentUserId: string;
  attachments: ProjectAttachment[];
  castingWorkflow?: CastingWorkflowData | null;
  children: ReactNode;
}) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const workspaceItems = buildProjectWorkspaceItems(projectId, castings, activities);

  const value: ProjectWorkspaceData = {
    projectId,
    project,
    castings,
    activities,
    rosterMembers,
    currentUserId,
    attachments,
    castingWorkflow,
    workspaceItems,
    selectedItemId,
    setSelectedItemId,
  };

  return (
    <ProjectWorkspaceContext.Provider value={value}>{children}</ProjectWorkspaceContext.Provider>
  );
}

export function useProjectWorkspace() {
  const ctx = useContext(ProjectWorkspaceContext);
  if (!ctx) {
    throw new Error("useProjectWorkspace must be used within ProjectWorkspaceProvider");
  }
  return ctx;
}

/** Overlay casting workflow data onto an existing workspace context without remounting the shell. */
export function ProjectWorkspaceCastingWorkflowBridge({
  castingWorkflow,
  attachments,
  children,
}: {
  castingWorkflow: CastingWorkflowData | null;
  attachments?: ProjectAttachment[];
  children: ReactNode;
}) {
  const parent = useProjectWorkspace();
  const value: ProjectWorkspaceData = {
    ...parent,
    castingWorkflow,
    attachments: attachments ?? parent.attachments,
  };

  return (
    <ProjectWorkspaceContext.Provider value={value}>{children}</ProjectWorkspaceContext.Provider>
  );
}
