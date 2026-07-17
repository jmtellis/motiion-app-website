import { FileText, LayoutDashboard, type LucideIcon } from "lucide-react";

import type { ProjectNavItem, ProjectWorkspaceConfig } from "./project-workspace-config";
import { getProjectWorkspaceConfig } from "./project-workspace-config";
import { getNormalizedProjectType, type ProjectType } from "./project-types";

export type ProjectNavSectionId = "project" | "workspace";

export type ProjectNavSection = {
  id: ProjectNavSectionId;
  label: string;
  items: ProjectNavItem[];
};

export type ProjectNavigation = {
  projectType: ProjectType;
  sections: ProjectNavSection[];
  workspace: ProjectNavItem[];
  project: ProjectNavItem[];
  config: ProjectWorkspaceConfig;
};

export const UNIVERSAL_PROJECT_NAVIGATION: ProjectNavItem[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard as LucideIcon,
    path: "overview",
    description: "Project home and summary",
  },
  {
    id: "files",
    label: "Files",
    icon: FileText as LucideIcon,
    path: "files",
    description: "Documents, media, and links",
  },
];

export function getProjectNavigation(project: {
  projectType?: string | null;
  type?: string | null;
}): ProjectNavigation {
  const projectType = getNormalizedProjectType(project.projectType ?? project.type);
  const config = getProjectWorkspaceConfig(projectType);

  return {
    projectType,
    project: UNIVERSAL_PROJECT_NAVIGATION,
    workspace: config.workspaceItems,
    config,
    sections: [
      { id: "project", label: "Project", items: UNIVERSAL_PROJECT_NAVIGATION },
      { id: "workspace", label: "Workspace", items: config.workspaceItems },
    ],
  };
}
