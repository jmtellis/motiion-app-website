import { redirect } from "next/navigation";
import { Suspense } from "react";

import { resolveLegacyCastingWorkspaceTab } from "@/lib/talent-buyers/casting/casting-routes";
import { getNormalizedProjectType } from "@/lib/talent-buyers/project-types";
import { fetchProjectRecord } from "@/lib/talent-buyers/projects";
import {
  isValidWorkspaceRoute,
  projectOverviewPath,
  projectPath,
} from "@/lib/talent-buyers/project-routes";
import { requireHiringAccount } from "@/lib/auth/session";

import { ProjectWorkspaceToolPanel } from "@/components/talent-buyers/project/ProjectWorkspaceToolPanel";

function WorkspacePanelFallback() {
  return (
    <div className="project-workspace__panel-body">
      <p className="project-workspace__panel-description">Loading workspace…</p>
    </div>
  );
}

export default async function ProjectWorkspaceTabPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; workspaceTab: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireHiringAccount();
  const { id, workspaceTab: rawWorkspaceTab } = await params;
  const query = await searchParams;
  const projectRecord = await fetchProjectRecord(id, profile.id);

  if (!projectRecord) {
    redirect(projectOverviewPath(id));
  }

  const projectType = getNormalizedProjectType(projectRecord.project_type);
  let workspaceTab = rawWorkspaceTab;

  if (projectType === "casting") {
    const resolved = resolveLegacyCastingWorkspaceTab(rawWorkspaceTab, query);
    if (resolved.redirectUrl) {
      const queryString = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (typeof value === "string") queryString.set(key, value);
      }
      const pathPart = resolved.redirectUrl.replace(/^\//, "");
      const [pathOnly, hashPart] = pathPart.split("#");
      const [segmentPath, existingQuery] = pathOnly.split("?");
      const merged = new URLSearchParams(existingQuery ?? "");
      queryString.forEach((v, k) => merged.set(k, v));
      const finalQuery = merged.toString();
      const suffix = finalQuery
        ? `${segmentPath}?${finalQuery}${hashPart ? `#${hashPart}` : ""}`
        : `${segmentPath}${hashPart ? `#${hashPart}` : ""}`;
      redirect(projectPath(id, suffix));
    }
    workspaceTab = resolved.tab;
  }

  if (!isValidWorkspaceRoute(projectRecord.project_type, workspaceTab)) {
    redirect(projectOverviewPath(id));
  }

  return (
    <Suspense fallback={<WorkspacePanelFallback />}>
      <ProjectWorkspaceToolPanel workspaceTab={workspaceTab} />
    </Suspense>
  );
}
