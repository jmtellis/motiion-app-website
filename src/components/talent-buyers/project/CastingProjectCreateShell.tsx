"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createProject, updateProject } from "@/app/(buyer-app)/(paid)/projects/actions";
import { castingWorkspaceHref } from "@/lib/talent-buyers/casting/casting-routes";
import { createDefaultCastingComposerForm } from "@/lib/talent-buyers/casting-composer-defaults";
import { getProjectCreateConfig } from "@/lib/talent-buyers/project-create-registry";
import type { CastingComposerForm } from "@/types/casting";
import type { ProjectAttachment, ProjectComposerForm } from "@/types/project";

import { CastingCreateWizard } from "./CastingCreateWizard";
import { seedProjectFormForType } from "./ProjectSelectionsPanel";

function mergeContainerFromCasting(
  container: ProjectComposerForm,
  casting: CastingComposerForm,
): ProjectComposerForm {
  return {
    ...container,
    projectId: container.projectId ?? casting.projectId ?? null,
    title: casting.title.trim() || container.title,
    description: casting.description || container.description,
    productionCompany: casting.productionCompany || container.productionCompany,
    startDate: casting.startDate || container.startDate,
    endDate: casting.endDate || container.endDate,
    location: casting.location || container.location,
    coverImageUrl: container.coverImageUrl || casting.coverImageUrl,
    projectType: "casting",
  };
}

export function CastingProjectCreateShell() {
  const router = useRouter();
  const draftSessionId = useId().replace(/:/g, "");
  const createConfig = useMemo(() => getProjectCreateConfig("casting"), []);

  const [containerForm, setContainerForm] = useState<ProjectComposerForm>(() =>
    seedProjectFormForType("casting", createConfig),
  );
  const [castingForm, setCastingForm] = useState<CastingComposerForm>(() => createDefaultCastingComposerForm());
  const [coverStoragePath, setCoverStoragePath] = useState<string | null>(null);

  const ensureProjectId = useCallback(async (): Promise<string | null> => {
    if (containerForm.projectId) return containerForm.projectId;

    const merged = mergeContainerFromCasting(containerForm, castingForm);
    if (!merged.title.trim()) {
      return null;
    }

    const result = await createProject(merged, true);
    if (!result.ok) {
      return null;
    }

    setContainerForm((current) => ({ ...merged, projectId: result.projectId }));
    setCastingForm((current) => ({
      ...current,
      projectId: result.projectId,
      title: merged.title,
      description: merged.description,
      productionCompany: merged.productionCompany,
    }));

    return result.projectId;
  }, [containerForm, castingForm]);

  function handleCoverChange(url: string, storagePath: string | null) {
    setCoverStoragePath(storagePath);
    setContainerForm((current) => ({ ...current, coverImageUrl: url }));
    setCastingForm((current) => ({ ...current, coverImageUrl: url }));
  }

  function handleAttachmentAdded(attachment: ProjectAttachment) {
    setContainerForm((current) => ({
      ...current,
      configuration: {
        ...current.configuration,
        attachments: [...current.configuration.attachments, attachment],
      },
    }));
  }

  async function handleCastingPublished(projectId: string) {
    const merged = mergeContainerFromCasting(containerForm, castingForm);
    const publishContainer = await updateProject({
      ...merged,
      projectId,
      configuration: { ...merged.configuration, composer_draft: false },
    });

    if (!publishContainer.ok) {
      return;
    }

    router.push(castingWorkspaceHref(projectId, "breakdown"));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CastingCreateWizard
      draftSessionId={draftSessionId}
      containerForm={containerForm}
      castingForm={castingForm}
      onContainerFormChange={setContainerForm}
      onCastingFormChange={setCastingForm}
      coverStoragePath={coverStoragePath}
      onCoverChange={handleCoverChange}
      onAttachmentAdded={handleAttachmentAdded}
      ensureProjectId={ensureProjectId}
      onPublished={handleCastingPublished}
    />
    </div>
  );
}
