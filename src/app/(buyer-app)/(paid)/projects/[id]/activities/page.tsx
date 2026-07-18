import { redirect } from "next/navigation";

import { projectOverviewPath } from "@/lib/talent-buyers/project-routes";

export default async function ProjectActivitiesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(projectOverviewPath(id));
}
