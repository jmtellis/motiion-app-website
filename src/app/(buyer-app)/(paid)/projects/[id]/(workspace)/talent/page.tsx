import { redirect } from "next/navigation";

import { requireHiringAccount } from "@/lib/auth/session";
import { fetchProjectRecord } from "@/lib/talent-buyers/projects";
import { getNormalizedProjectType } from "@/lib/talent-buyers/project-types";
import {
  projectOverviewTalentPath,
  projectWorkspacePath,
} from "@/lib/talent-buyers/project-routes";

export default async function ProjectTalentPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireHiringAccount();
  const { id } = await params;
  const project = await fetchProjectRecord(id, profile.id);

  if (project && getNormalizedProjectType(project.project_type) === "casting") {
    redirect(projectWorkspacePath(id, "talent-search"));
  }

  redirect(projectOverviewTalentPath(id));
}
