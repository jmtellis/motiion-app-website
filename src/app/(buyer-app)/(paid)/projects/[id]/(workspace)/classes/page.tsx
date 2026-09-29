import { redirect } from "next/navigation";

import { ProjectClassesAbilityPage } from "@/components/talent-buyers/project/composable/ProjectClassesAbilityPage";
import { requireHiringAccount } from "@/lib/auth/session";
import {
  hasActiveAbility,
  isComposableProject,
  resolveProjectAbilities,
} from "@/lib/talent-buyers/project-abilities";
import { listProjectClassSessions, summarizeClassSeries } from "@/lib/talent-buyers/project-classes";
import { projectHomePath } from "@/lib/talent-buyers/project-routes";
import { fetchProjectRecord } from "@/lib/talent-buyers/projects";

export default async function ProjectClassesPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireHiringAccount();
  const { id } = await params;
  const project = await fetchProjectRecord(id, profile.id);

  if (!project || !isComposableProject(project)) {
    redirect(projectHomePath(id));
  }

  const abilities = resolveProjectAbilities(project);
  if (!abilities.some((ability) => ability.id === "classes")) {
    redirect(projectHomePath(id));
  }

  const sessions = await listProjectClassSessions(id);

  return (
    <ProjectClassesAbilityPage
      projectId={id}
      sessions={sessions}
      summary={summarizeClassSeries(sessions)}
      paused={!hasActiveAbility(abilities, "classes")}
    />
  );
}
