import { redirect } from "next/navigation";

import { ProjectRosterAbilityPage } from "@/components/talent-buyers/project/composable/ProjectRosterAbilityPage";
import { requireHiringAccount } from "@/lib/auth/session";
import { listCollections } from "@/lib/talent-buyers/library";
import { isComposableProject, parseAbilityModules } from "@/lib/talent-buyers/project-abilities";
import { projectHomePath, projectOverviewTalentPath } from "@/lib/talent-buyers/project-routes";
import { fetchProjectRecord } from "@/lib/talent-buyers/projects";

export default async function ProjectRosterPage({
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

  if (!project || !isComposableProject(project)) {
    redirect(projectOverviewTalentPath(id));
  }
  if (!parseAbilityModules(project.enabled_modules).roster) {
    redirect(projectHomePath(id));
  }

  const { collections } = await listCollections();

  return (
    <ProjectRosterAbilityPage
      collections={collections.map((collection) => ({
        id: collection.id,
        name: collection.name,
        talentCount: collection.talentCount,
      }))}
      inviteOpen={query.invite === "1"}
    />
  );
}
