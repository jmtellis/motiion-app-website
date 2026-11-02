import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { ProjectWorkspaceCastingBootstrap } from "@/components/talent-buyers/project/ProjectWorkspaceCastingBootstrap";
import { ProjectWorkspaceProvider } from "@/components/talent-buyers/project/ProjectWorkspaceContext";
import { ProjectWorkspaceShell } from "@/components/talent-buyers/project/ProjectWorkspaceShell";
import type { ProjectWorkspaceMeta } from "@/components/talent-buyers/project/ProjectWorkspaceContext";
import { fetchPosterCastingDetail } from "@/lib/talent-buyers/casting-projects";
import { listProjectCastings } from "@/lib/talent-buyers/castings";
import { listProjectActivities } from "@/lib/talent-buyers/project-activities";
import { resolveWorkspaceAttachments } from "@/lib/talent-buyers/project-attachments";
import { listProjectRosterMembers } from "@/lib/talent-buyers/project-roster";
import { fetchAccessibleProjectRecord } from "@/lib/talent-buyers/projects";
import { isProjectDraft } from "@/lib/talent-buyers/project-payload";
import { getNormalizedProjectType } from "@/lib/talent-buyers/project-types";
import {
  parseComposableConfig,
  resolveProjectAbilities,
  resolveWorkspaceProjectType,
} from "@/lib/talent-buyers/project-abilities";
import { requireHiringAccount } from "@/lib/auth/session";
import { recordBuyerContentView } from "@/lib/talent-buyers/dashboard-live";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ProjectWorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const profile = await requireHiringAccount();
  const { id } = await params;

  const projectRecord = await fetchAccessibleProjectRecord(id, profile.id);
  if (!projectRecord) notFound();
  const db = await createServerSupabaseClient();
  const canReviewCasting = projectRecord.poster_id === profile.id || Boolean(db && (await db.rpc("is_project_operator", { p_project_id: id, p_user_id: profile.id })).data);
  const [liveDetail, castings, { activities }, rosterResult] = await Promise.all([
    fetchPosterCastingDetail(id, profile.id),
    listProjectCastings(id, profile.id),
    listProjectActivities(id), listProjectRosterMembers(id),
  ]);
  if (!liveDetail) notFound();
  if (rosterResult.error) throw new Error(rosterResult.error);
  const rosterMembers = rosterResult.members;

  await recordBuyerContentView("project", id);

  const resolvedProject = projectRecord;
  const workspaceProjectType = resolveWorkspaceProjectType(projectRecord);
  const isCastingProject = getNormalizedProjectType(workspaceProjectType) === "casting";
  const composableConfig = parseComposableConfig(projectRecord.project_configuration);

  const attachments = resolveWorkspaceAttachments({
    project_type: workspaceProjectType,
    project_configuration: resolvedProject.project_configuration as Record<string, unknown> | null,
    casting_configuration: resolvedProject.casting_configuration as Record<string, unknown> | null,
  });

  const project: ProjectWorkspaceMeta = {
    notes: resolvedProject.project_abilities?.find((ability) => ability.ability === "notes")?.settings?.body ?? "",
    isOwner: resolvedProject.poster_id === profile.id,
    canReviewCasting,
    id,
    title: resolvedProject.title,
    coverImageUrl: resolvedProject.cover_image_url,
    productionCompanyLogoUrl: resolvedProject.production_company_logo_url,
    projectType: workspaceProjectType,
    location: resolvedProject.location,
    productionCompany: resolvedProject.production_company,
    isDraft: isProjectDraft(resolvedProject),
    updatedAt: resolvedProject.updated_at,
    composable: composableConfig
      ? {
          abilities: resolveProjectAbilities(resolvedProject),
          startDate: resolvedProject.start_date ?? null,
          endDate: resolvedProject.end_date ?? null,
          createdAt: resolvedProject.created_at ?? null,
          promptDismissedAt: composableConfig.prompt_dismissed_at ?? null,
          archivedAt: composableConfig.archived_at ?? null,
        }
      : null,
  };

  return (
    <BuyerAppPage fullWidth className="!space-y-0 flex min-h-0 flex-1 flex-col">
      <ProjectWorkspaceProvider
        projectId={id}
        project={project}
        castings={castings}
        activities={activities}
        rosterMembers={rosterMembers}
        currentUserId={profile.id}
        attachments={attachments}
        castingWorkflow={null}
      >
        <Suspense
          fallback={<ProjectWorkspaceShell><div className="project-workspace__panel-body py-12" role="status" aria-live="polite">Loading casting details…</div></ProjectWorkspaceShell>}
        >
          <ProjectWorkspaceCastingBootstrap
            projectId={id}
            userId={profile.id}
            enabled={isCastingProject}
            initialAttachments={attachments}
          >
            <ProjectWorkspaceShell>{children}</ProjectWorkspaceShell>
          </ProjectWorkspaceCastingBootstrap>
        </Suspense>
      </ProjectWorkspaceProvider>
    </BuyerAppPage>
  );
}
