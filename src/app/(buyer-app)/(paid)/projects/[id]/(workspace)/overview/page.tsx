import { redirect } from "next/navigation";

import { ComposableProjectHome } from "@/components/talent-buyers/project/composable/ComposableProjectHome";
import { ProjectWorkspaceOverviewPanel } from "@/components/talent-buyers/project/ProjectWorkspaceOverviewPanel";
import { requireHiringAccount } from "@/lib/auth/session";
import {
  isComposableProject,
  isProjectAbilityId,
  parseAbilityModules,
} from "@/lib/talent-buyers/project-abilities";
import { listProjectClassSessions, summarizeClassSeries } from "@/lib/talent-buyers/project-classes";
import { fetchProjectRecord } from "@/lib/talent-buyers/projects";
import { getNormalizedProjectType } from "@/lib/talent-buyers/project-types";
import { projectWorkspacePath } from "@/lib/talent-buyers/project-routes";

export default async function ProjectOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireHiringAccount();
  const { id } = await params;
  const query = await searchParams;
  const project = await fetchProjectRecord(id, profile.id);

  if (project && isComposableProject(project)) {
    const classSeries = parseAbilityModules(project.enabled_modules).classes
      ? summarizeClassSeries(await listProjectClassSessions(id))
      : null;
    const suggest = typeof query.suggest === "string" && isProjectAbilityId(query.suggest) ? query.suggest : null;
    return <ComposableProjectHome classSeries={classSeries} suggest={suggest} />;
  }

  if (project && getNormalizedProjectType(project.project_type) === "casting") {
    redirect(projectWorkspacePath(id, "breakdown"));
  }

  return <ProjectWorkspaceOverviewPanel />;
}
