import { redirect } from "next/navigation";

import { projectOverviewPath, resolveLegacyProjectHref } from "@/lib/talent-buyers/project-routes";

/**
 * Legacy entry: /projects/:id and /projects/:id?tab=…
 */
export default async function BuyerProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const rawTab = typeof query.tab === "string" ? query.tab : null;
  redirect(rawTab ? resolveLegacyProjectHref(id, rawTab) : projectOverviewPath(id));
}
