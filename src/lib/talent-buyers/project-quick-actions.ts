import type { ProjectQuickAction } from "./project-workspace-config";
import { getProjectWorkspaceConfig } from "./project-workspace-config";
import { getNormalizedProjectType } from "./project-types";

/**
 * Contextual Add-menu actions for a project, derived from workspace config.
 * Prefer this over a generic add picker when the project type is known.
 */
export function getProjectQuickActions(rawType: string | null | undefined): ProjectQuickAction[] {
  return getProjectWorkspaceConfig(rawType).quickActions;
}

/** Compact Add menu: first actionable items plus a consistent timeline entry. */
export function getProjectAddMenuActions(rawType: string | null | undefined): ProjectQuickAction[] {
  const actions = getProjectQuickActions(rawType);
  const preferred = actions.filter((action) => action.id !== "add-timeline-item").slice(0, 4);
  const timeline = actions.find((action) => action.id === "add-timeline-item");
  if (timeline && !preferred.some((action) => action.id === timeline.id)) {
    preferred.push(timeline);
  }
  return preferred;
}

export function getWorkspaceEmptyState(rawType: string | null | undefined, workspaceTab: string) {
  const config = getProjectWorkspaceConfig(rawType);
  return (
    config.emptyStates[workspaceTab] ?? {
      title: `No ${workspaceTab.replace(/-/g, " ")} yet`,
      description: `Start building this part of your ${getNormalizedProjectType(rawType).replace(/_/g, " ")} workspace.`,
      actionLabel: "Get started",
    }
  );
}
