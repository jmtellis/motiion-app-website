import { redirect } from "next/navigation";

import { ProjectWorkspaceOverviewPanel } from "@/components/talent-buyers/project/ProjectWorkspaceOverviewPanel";
import { requireHiringAccount } from "@/lib/auth/session";
import { fetchProjectRecord } from "@/lib/talent-buyers/projects";
import { getNormalizedProjectType } from "@/lib/talent-buyers/project-types";
import { projectWorkspacePath } from "@/lib/talent-buyers/project-routes";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireHiringAccount();
  const { id } = await params;
  const project = await fetchProjectRecord(id, profile.id);

  if (project && getNormalizedProjectType(project.project_type) === "casting") {
    redirect(projectWorkspacePath(id, "breakdown"));
  }

  return <ProjectWorkspaceOverviewPanel />;
}
