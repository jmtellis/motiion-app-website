import { redirect } from "next/navigation";

import { requireHiringAccount } from "@/lib/auth/session";
import { createIntentPath } from "@/lib/talent-buyers/create-intent";
import { listProjectActivities } from "@/lib/talent-buyers/project-activities";
import { getNormalizedProjectType } from "@/lib/talent-buyers/project-types";
import { fetchProjectRecord } from "@/lib/talent-buyers/projects";
import {
  projectLandingPath,
  projectOverviewPath,
  resolveLegacyProjectHref,
} from "@/lib/talent-buyers/project-routes";

/**
 * Legacy entry: /projects/:id and /projects/:id?tab=…
 * Casting → Breakdown. Event shells → linked activity or activity create.
 */
export default async function BuyerProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireHiringAccount();
  const { id } = await params;
  const query = await searchParams;
  const rawTab = typeof query.tab === "string" ? query.tab : null;
  const project = await fetchProjectRecord(id, profile.id);
  const projectType = project?.project_type ?? null;

  if (rawTab) {
    redirect(resolveLegacyProjectHref(id, rawTab, projectType));
  }

  if (project && getNormalizedProjectType(projectType) === "event") {
    const { activities } = await listProjectActivities(id);
    const primary = activities[0];
    if (primary) {
      redirect(`/calendar/${primary.id}`);
    }
    redirect(createIntentPath("event", id));
  }

  if (project) {
    redirect(projectLandingPath(id, projectType));
  }

  redirect(projectOverviewPath(id));
}
