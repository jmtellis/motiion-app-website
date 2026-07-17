import { redirect } from "next/navigation";

import { fetchProjectRecord } from "@/lib/talent-buyers/projects";
import { getNormalizedProjectType } from "@/lib/talent-buyers/project-types";
import { projectOverviewPath, projectWorkspacePath } from "@/lib/talent-buyers/project-routes";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function ProjectCastingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireHiringAccount();
  const project = await fetchProjectRecord(id, profile.id);

  if (project && getNormalizedProjectType(project.project_type) === "casting") {
    redirect(projectWorkspacePath(id, "breakdown"));
  }

  redirect(projectOverviewPath(id));
}
