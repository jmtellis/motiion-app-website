import { notFound } from "next/navigation";

import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { CastingCreateShell } from "@/components/talent-buyers/project/CastingCreateShell";
import { childCastingToComposerForm } from "@/lib/talent-buyers/casting-child-payload";
import { createDefaultRole } from "@/lib/talent-buyers/casting-composer-defaults";
import { fetchChildCastingDetail } from "@/lib/talent-buyers/castings";
import { fetchProjectRecord, projectRecordToComposerForm } from "@/lib/talent-buyers/projects";
import { requireHiringAccount } from "@/lib/auth/session";
import type { CastingConfiguration } from "@/types/casting";

import { CastingEditChrome } from "./CastingEditChrome";

export default async function EditProjectCastingPage({
  params,
}: {
  params: Promise<{ id: string; castingId: string }>;
}) {
  const profile = await requireHiringAccount();
  const { id, castingId } = await params;
  const project = await fetchProjectRecord(id, profile.id);
  if (!project) notFound();

  const detail = await fetchChildCastingDetail(castingId, id, profile.id);
  if (!detail) notFound();

  const initialForm = childCastingToComposerForm(
    detail.casting,
    detail.roles,
    id,
    detail.bridgedRoles ?? [],
    {
      title: project.title,
      description: project.description,
      production_company: project.production_company,
      production_company_logo_url: project.production_company_logo_url,
      cover_image_url: project.cover_image_url,
      cover_thumbnail_alignment: project.cover_thumbnail_alignment,
      location: project.location,
      start_date: project.start_date,
      end_date: project.end_date,
      rate_type: project.rate_type,
      rate_details: project.rate_details,
      casting_configuration: project.casting_configuration as CastingConfiguration | null,
    },
  );
  if (!initialForm.roles.length) initialForm.roles = [createDefaultRole()];

  const initialContainerForm = projectRecordToComposerForm(project);

  return (
    <BuyerAppPage fullWidth className="!space-y-0 flex min-h-0 flex-1 flex-col">
      <CastingEditChrome projectId={id} projectTitle={project.title} castingTitle={detail.casting.title} />
      <CastingCreateShell
        projectId={id}
        initialForm={initialForm}
        initialContainerForm={initialContainerForm}
        mode="edit"
      />
    </BuyerAppPage>
  );
}
