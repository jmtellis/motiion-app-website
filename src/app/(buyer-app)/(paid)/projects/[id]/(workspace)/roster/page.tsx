import { redirect } from "next/navigation";

import { ProjectRosterAbilityPage } from "@/components/talent-buyers/project/composable/ProjectRosterAbilityPage";
import { requireHiringAccount } from "@/lib/auth/session";
import { listProjectPeopleGroups } from "@/lib/talent-buyers/project-roster";
import { listCollections } from "@/lib/talent-buyers/library";
import { isComposableProject } from "@/lib/talent-buyers/project-abilities";
import { projectOverviewTalentPath } from "@/lib/talent-buyers/project-routes";
import { fetchAccessibleProjectRecord } from "@/lib/talent-buyers/projects";

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
  const project = await fetchAccessibleProjectRecord(id, profile.id);

  if (!project || !isComposableProject(project)) {
    redirect(projectOverviewTalentPath(id));
  }

  const [{ collections }, groupData] = await Promise.all([listCollections(), listProjectPeopleGroups(id)]);

  return (
    <ProjectRosterAbilityPage
      collections={collections.map((collection) => ({
        id: collection.id,
        name: collection.name,
        talentCount: collection.talentCount,
      }))}
      key={id}
      groupData={groupData}
      inviteOpen={query.invite === "1"}
    />
  );
}
