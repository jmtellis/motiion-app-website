"use client";
import { ComposableProjectHome } from "@/components/talent-buyers/project/composable/ComposableProjectHome";
import { ProjectWorkspaceOverviewPanel } from "@/components/talent-buyers/project/ProjectWorkspaceOverviewPanel";
import { useProjectWorkspace } from "@/components/talent-buyers/project/ProjectWorkspaceContext";

export default function ProjectOverviewPage() {
  const { project } = useProjectWorkspace();
  return project.composable || project.projectType === "casting" ? <ComposableProjectHome /> : <ProjectWorkspaceOverviewPanel />;
}
