"use client";

import { useCallback, useId, useState } from "react";
import { useRouter } from "next/navigation";

import { updateProject } from "@/app/(buyer-app)/(paid)/projects/actions";
import { castingWorkspaceHref } from "@/lib/talent-buyers/casting/casting-routes";
import { createDefaultCastingComposerForm } from "@/lib/talent-buyers/casting-composer-defaults";
import { createDefaultProjectComposerForm } from "@/lib/talent-buyers/project-composer-defaults";
import type { CastingComposerForm } from "@/types/casting";
import type { ProjectAttachment, ProjectComposerForm } from "@/types/project";

import { CastingCreateWizard } from "./CastingCreateWizard";

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

/**
 * Scoped casting create/edit shell reused by `/projects/.../castings/.../edit`.
 * Edit uses the same step-by-step wizard as greenfield create (prefilled, start skipped).
 */
export function CastingCreateShell({
  projectId,
  initialForm,
  initialContainerForm,
  mode = "create",
}: {
  projectId: string;
  initialForm?: CastingComposerForm;
  initialContainerForm?: ProjectComposerForm;
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const draftSessionId = useId().replace(/:/g, "");
  const workspaceHref = castingWorkspaceHref(projectId, "breakdown");

  const [containerForm, setContainerForm] = useState<ProjectComposerForm>(() => {
    if (initialContainerForm) {
      return { ...initialContainerForm, projectId, projectType: "casting" };
    }
    return {
      ...createDefaultProjectComposerForm(),
      projectId,
      projectType: "casting",
      title: initialForm?.title ?? "",
      description: initialForm?.description ?? "",
      productionCompany: initialForm?.productionCompany ?? "",
      coverImageUrl: initialForm?.coverImageUrl ?? "",
      location: initialForm?.location ?? "",
      startDate: initialForm?.startDate ?? "",
      endDate: initialForm?.endDate ?? "",
      enabledModules: { casting: true, activities: false },
    };
  });

  const [castingForm, setCastingForm] = useState<CastingComposerForm>(() => ({
    ...(initialForm ?? createDefaultCastingComposerForm()),
    projectId,
  }));

  const [coverStoragePath, setCoverStoragePath] = useState<string | null>(null);

  const ensureProjectId = useCallback(async (): Promise<string | null> => {
    return containerForm.projectId ?? projectId;
  }, [containerForm.projectId, projectId]);

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

  async function handleCastingPublished(publishedProjectId: string) {
    const merged = mergeContainerFromCasting(containerForm, castingForm);
    await updateProject({
      ...merged,
      projectId: publishedProjectId,
      configuration: { ...merged.configuration, composer_draft: false },
    });

    router.push(workspaceHref);
    router.refresh();
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
        mode={mode}
        closeHref={workspaceHref}
        draftRedirectHref={workspaceHref}
        initialStepId={mode === "edit" ? "basics" : "start"}
      />
    </div>
  );
}
