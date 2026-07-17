import { redirect } from "next/navigation";

import { projectOverviewTalentPath } from "@/lib/talent-buyers/project-routes";

export default async function ProjectTalentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(projectOverviewTalentPath(id));
}
