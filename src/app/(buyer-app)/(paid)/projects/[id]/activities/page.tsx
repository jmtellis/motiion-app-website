import { redirect } from "next/navigation";

import { requireHiringAccount } from "@/lib/auth/session";
import { fetchProjectRecord } from "@/lib/talent-buyers/projects";
import {
  projectLandingPath,
  projectOverviewPath,
} from "@/lib/talent-buyers/project-routes";

export default async function ProjectActivitiesPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireHiringAccount();
  const { id } = await params;
  const project = await fetchProjectRecord(id, profile.id);

  if (project) {
    redirect(projectLandingPath(id, project.project_type));
  }

  redirect(projectOverviewPath(id));
}
