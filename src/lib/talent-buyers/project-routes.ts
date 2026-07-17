import { getNormalizedProjectType, type ProjectType } from "./project-types";
import { getProjectWorkspaceConfig } from "./project-workspace-config";

export type ProjectTabId = "overview" | "files";

export const PROJECT_TAB_IDS: ProjectTabId[] = ["overview", "files"];

const LEGACY_TAB_MAP: Record<string, ProjectTabId> = {
  overview: "overview",
  files: "files",
};

export function projectPath(projectId: string, ...segments: string[]) {
  const suffix = segments.filter(Boolean).join("/");
  return suffix ? `/projects/${projectId}/${suffix}` : `/projects/${projectId}`;
}

export function projectOverviewPath(projectId: string) {
  return projectPath(projectId, "overview");
}

export function projectOverviewTalentPath(projectId: string) {
  return `${projectOverviewPath(projectId)}#talent`;
}

export function projectTabPath(projectId: string, tab: ProjectTabId) {
  return projectPath(projectId, tab);
}

export function projectWorkspacePath(projectId: string, workspaceTab: string) {
  return projectPath(projectId, "workspace", workspaceTab);
}

export function isProjectTabId(value: string): value is ProjectTabId {
  return (PROJECT_TAB_IDS as string[]).includes(value);
}

export function parseLegacyProjectTab(value: string | null | undefined): ProjectTabId | null {
  if (!value) return null;
  if (value === "timeline" || value === "activities" || value === "talent") {
    return "overview";
  }
  return LEGACY_TAB_MAP[value] ?? null;
}

export function resolveLegacyProjectHref(projectId: string, tab: string | null | undefined): string {
  if (tab === "messages") return "/messages";
  if (tab === "talent") return projectOverviewTalentPath(projectId);
  if (tab === "timeline" || tab === "activities") return projectOverviewPath(projectId);
  const parsed = parseLegacyProjectTab(tab);
  if (parsed) return projectTabPath(projectId, parsed);
  return projectOverviewPath(projectId);
}

export function isValidWorkspaceRoute(
  rawType: string | null | undefined,
  workspaceTab: string,
): boolean {
  const config = getProjectWorkspaceConfig(rawType);
  return config.workspaceItems.some((item) => item.id === workspaceTab || item.path === workspaceTab);
}

export function resolveProjectHref(
  projectId: string,
  opts: { tab?: string | null; workspaceTab?: string | null; projectType?: string | null },
): string {
  if (opts.workspaceTab) {
    if (isValidWorkspaceRoute(opts.projectType, opts.workspaceTab)) {
      return projectWorkspacePath(projectId, opts.workspaceTab);
    }
    return projectOverviewPath(projectId);
  }

  return resolveLegacyProjectHref(projectId, opts.tab);
}

export function getDefaultWorkspaceTab(rawType: string | null | undefined): string | null {
  const config = getProjectWorkspaceConfig(rawType);
  return config.workspaceItems[0]?.id ?? null;
}

export function projectCreateLandingPath(projectId: string, rawType: string | null | undefined) {
  const tab = getDefaultWorkspaceTab(rawType);
  if (tab) return projectWorkspacePath(projectId, tab);
  return projectOverviewPath(projectId);
}

export function assertWorkspaceTabForType(
  rawType: string | null | undefined,
  workspaceTab: string,
): { ok: true; projectType: ProjectType } | { ok: false; redirectTo: string; projectId: string } {
  const projectType = getNormalizedProjectType(rawType);
  if (isValidWorkspaceRoute(projectType, workspaceTab)) {
    return { ok: true, projectType };
  }
  return { ok: false, redirectTo: "overview", projectId: "" };
}
