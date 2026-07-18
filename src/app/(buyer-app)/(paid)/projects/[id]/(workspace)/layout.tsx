import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { ProjectWorkspaceCastingBootstrap } from "@/components/talent-buyers/project/ProjectWorkspaceCastingBootstrap";
import { ProjectWorkspaceProvider } from "@/components/talent-buyers/project/ProjectWorkspaceContext";
import { ProjectWorkspaceShell } from "@/components/talent-buyers/project/ProjectWorkspaceShell";
import type { ProjectWorkspaceMeta } from "@/components/talent-buyers/project/ProjectWorkspaceLeftRail";
import { fetchPosterCastingDetail } from "@/lib/talent-buyers/casting-projects";
import { listProjectCastings } from "@/lib/talent-buyers/castings";
import { listProjectActivities } from "@/lib/talent-buyers/project-activities";
import { resolveWorkspaceAttachments } from "@/lib/talent-buyers/project-attachments";
import { listProjectRosterMembers } from "@/lib/talent-buyers/project-roster";
import { fetchProjectRecord } from "@/lib/talent-buyers/projects";
import { isProjectDraft } from "@/lib/talent-buyers/project-payload";
import { resolvePrimaryCastingId } from "@/lib/talent-buyers/casting/casting-workflow-data";
import { syncProjectCastingConfigurationFromCastingId } from "@/lib/talent-buyers/casting/sync-project-casting-config";
import { getNormalizedProjectType } from "@/lib/talent-buyers/project-types";
import { requireHiringAccount } from "@/lib/auth/session";
import { recordBuyerContentView } from "@/lib/talent-buyers/dashboard-live";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function castingMirrorNeedsRepair(project: {
  title?: string | null;
  production_company?: string | null;
  rate_type?: string | null;
  visibility?: string | null;
  casting_configuration?: Record<string, unknown> | null;
}): boolean {
  const cfg = project.casting_configuration ?? {};
  const substantiveKeys = Object.keys(cfg).filter(
    (key) => key !== "schema_version" && key !== "composer_draft" && key !== "_composer_meta",
  );
  if (substantiveKeys.length < 3) return true;

  const deadline = typeof cfg.submission_deadline_iso8601 === "string" ? cfg.submission_deadline_iso8601 : "";
  if (deadline && !/(Z|[+-]\d{2}:\d{2})$/.test(deadline)) return true;

  if (!project.title?.trim()) return true;
  if (!project.rate_type || project.rate_type === "tbd") {
    // Prefer repairing when config claims paid but project rate column is missing/TBD.
    if (cfg.compensation_category_raw === "paid") return true;
  }

  // Invite-only / private-link castings previously wrote projects.visibility=private,
  // which blocked talent iOS detail loads.
  const presentation = String(cfg.visibility_presentation_raw ?? "").toLowerCase();
  if (
    project.visibility === "private" &&
    (presentation === "invite_only" || presentation === "private_link" || presentation === "unlisted")
  ) {
    return true;
  }

  return false;
}

export default async function ProjectWorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const profile = await requireHiringAccount();
  const { id } = await params;

  const [liveDetail, projectRecord, castings, { activities }, { members: rosterMembers }] =
    await Promise.all([
      fetchPosterCastingDetail(id, profile.id),
      fetchProjectRecord(id, profile.id),
      listProjectCastings(id, profile.id),
      listProjectActivities(id),
      listProjectRosterMembers(id),
    ]);

  if (!liveDetail || !projectRecord) {
    notFound();
  }

  await recordBuyerContentView("project", id);

  let resolvedProject = projectRecord;
  const isCastingProject = getNormalizedProjectType(projectRecord.project_type) === "casting";

  if (isCastingProject && castingMirrorNeedsRepair(projectRecord)) {
    const supabase = await createServerSupabaseClient();
    const castingId = await resolvePrimaryCastingId(id, profile.id);
    if (supabase && castingId) {
      await syncProjectCastingConfigurationFromCastingId(
        supabase,
        id,
        castingId,
        isProjectDraft(projectRecord),
      );
      const refreshed = await fetchProjectRecord(id, profile.id);
      if (refreshed) resolvedProject = refreshed;
    }
  }

  const attachments = resolveWorkspaceAttachments({
    project_type: resolvedProject.project_type,
    project_configuration: resolvedProject.project_configuration as Record<string, unknown> | null,
    casting_configuration: resolvedProject.casting_configuration as Record<string, unknown> | null,
  });

  const castingConfig = resolvedProject.casting_configuration as Record<string, unknown> | null;
  const castingHasAttachments =
    Array.isArray(castingConfig?.attachments) && castingConfig.attachments.length > 0;
  const needsAttachmentMigration =
    isCastingProject && !castingHasAttachments && attachments.length > 0;

  const project: ProjectWorkspaceMeta = {
    id,
    title: resolvedProject.title,
    coverImageUrl: resolvedProject.cover_image_url,
    projectType: resolvedProject.project_type,
    location: resolvedProject.location,
    productionCompany: resolvedProject.production_company,
    isDraft: isProjectDraft(resolvedProject),
    updatedAt: resolvedProject.updated_at,
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
          fallback={<ProjectWorkspaceShell>{children}</ProjectWorkspaceShell>}
        >
          <ProjectWorkspaceCastingBootstrap
            projectId={id}
            userId={profile.id}
            enabled={isCastingProject}
            initialAttachments={attachments}
            needsAttachmentMigration={needsAttachmentMigration}
          >
            <ProjectWorkspaceShell>{children}</ProjectWorkspaceShell>
          </ProjectWorkspaceCastingBootstrap>
        </Suspense>
      </ProjectWorkspaceProvider>
    </BuyerAppPage>
  );
}
