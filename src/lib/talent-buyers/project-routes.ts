import { getNormalizedProjectType, type ProjectType } from "./project-types";
import { getProjectWorkspaceConfig } from "./project-workspace-config";

type ProjectNavLookup = {
  project: Array<{ id: string }>;
  workspace: Array<{ id: string }>;
};

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

/** Default landing path for a project by type (casting → Breakdown). */
export function projectLandingPath(
  projectId: string,
  rawType: string | null | undefined,
): string {
  if (getNormalizedProjectType(rawType) === "casting") {
    return projectWorkspacePath(projectId, "breakdown");
  }
  return projectOverviewPath(projectId);
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

/** Routes under `(workspace)` for project workspace views. */
const PROJECT_WORKSPACE_PATH_SEGMENTS = new Set([
  "overview",
  "files",
  "workspace",
  "messages",
  "timeline",
  "talent",
]);

/** True for routes that render inside the project workspace shell. */
export function isProjectWorkspacePath(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "projects") return false;
  const projectId = parts[1];
  if (!projectId || projectId === "new") return false;
  const segment = parts[2];
  if (!segment) return false;
  return PROJECT_WORKSPACE_PATH_SEGMENTS.has(segment);
}

/** Resolve which project / workspace nav item is active for the current path. */
export function resolveProjectNavActive(
  pathname: string,
  projectId: string,
  navigation?: ProjectNavLookup | null,
): { section: "project" | "workspace"; id: string } {
  const base = `/projects/${projectId}`;
  let id: string;
  let fallbackSection: "project" | "workspace" = "project";

  if (pathname.startsWith(`${base}/workspace/`)) {
    id = pathname.slice(`${base}/workspace/`.length).split("/")[0] ?? "";
    fallbackSection = "workspace";
  } else {
    const segment = pathname.slice(base.length + 1).split("/")[0] ?? "overview";
    id =
      segment === "activities" || segment === "timeline" || segment === "talent"
        ? "overview"
        : segment || "overview";
  }

  if (navigation?.workspace.some((item) => item.id === id)) {
    return { section: "workspace", id };
  }
  if (navigation?.project.some((item) => item.id === id)) {
    return { section: "project", id };
  }

  return { section: fallbackSection, id };
}

export function parseLegacyProjectTab(value: string | null | undefined): ProjectTabId | null {
  if (!value) return null;
  if (value === "timeline" || value === "activities" || value === "talent") {
    return "overview";
  }
  return LEGACY_TAB_MAP[value] ?? null;
}

export function resolveLegacyProjectHref(
  projectId: string,
  tab: string | null | undefined,
  rawType?: string | null,
): string {
  if (tab === "messages") return "/messages";

  const isCasting = getNormalizedProjectType(rawType) === "casting";
  if (isCasting) {
    if (tab === "talent") return projectWorkspacePath(projectId, "talent-search");
    if (tab === "files") return projectWorkspacePath(projectId, "breakdown");
    if (tab === "overview" || tab === "timeline" || tab === "activities" || !tab) {
      return projectWorkspacePath(projectId, "breakdown");
    }
    if (isValidWorkspaceRoute("casting", tab)) {
      return projectWorkspacePath(projectId, tab);
    }
    return projectWorkspacePath(projectId, "breakdown");
  }

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
    return projectLandingPath(projectId, opts.projectType);
  }

  return resolveLegacyProjectHref(projectId, opts.tab, opts.projectType);
}

export function getDefaultWorkspaceTab(rawType: string | null | undefined): string | null {
  const config = getProjectWorkspaceConfig(rawType);
  return config.workspaceItems[0]?.id ?? null;
}

export function projectCreateLandingPath(projectId: string, rawType: string | null | undefined) {
  if (getNormalizedProjectType(rawType) === "casting") {
    return projectWorkspacePath(projectId, "breakdown");
  }
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
  return {
    ok: false,
    redirectTo: projectType === "casting" ? "breakdown" : "overview",
    projectId: "",
  };
}
