"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteProject, updateProject } from "@/app/(buyer-app)/(paid)/projects/actions";
import { saveProjectCastingChanges } from "@/app/(buyer-app)/(paid)/projects/[id]/castings/actions";
import { CastingBasicsStep } from "@/components/talent-buyers/casting/wizard-steps/CastingBasicsStep";
import { CastingTypeVisibilityStep } from "@/components/talent-buyers/casting/wizard-steps/CastingTypeVisibilityStep";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { useProjectWorkspace } from "@/components/talent-buyers/project/ProjectWorkspaceContext";
import { enrichRolesWithCounts } from "@/lib/talent-buyers/casting/casting-metrics";
import { buildWorkspaceCastingForm } from "@/lib/talent-buyers/casting/workspace-casting-form";
import { syncContainerAndCasting } from "@/lib/talent-buyers/casting-create-wizard";
import { createDefaultProjectComposerForm } from "@/lib/talent-buyers/project-composer-defaults";
import type { CastingComposerForm } from "@/types/casting";
import type { ProjectComposerForm } from "@/types/project";

import "@/components/talent-buyers/project/casting-create-wizard.css";
import "@/components/talent-buyers/project/project-create.css";

function buildContainerForm(
  projectId: string,
  project: {
    title: string;
    productionCompany: string | null;
    coverImageUrl: string | null;
    isDraft: boolean;
    location: string | null;
  },
  castingForm: CastingComposerForm,
): ProjectComposerForm {
  return {
    ...createDefaultProjectComposerForm(),
    projectId,
    projectType: "casting",
    title: castingForm.title || project.title,
    description: castingForm.description,
    productionCompany: castingForm.productionCompany || project.productionCompany || "",
    coverImageUrl: castingForm.coverImageUrl || project.coverImageUrl || "",
    location: castingForm.location || project.location || "",
    startDate: castingForm.startDate,
    endDate: castingForm.endDate,
    enabledModules: { casting: true, activities: false },
    configuration: {
      attachments: castingForm.configuration.attachments ?? [],
      composer_draft: project.isDraft,
    },
  };
}

export function EditCastingProjectModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const draftSessionId = useId().replace(/:/g, "");
  const { projectId, project, castingWorkflow } = useProjectWorkspace();
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverStoragePath, setCoverStoragePath] = useState<string | null>(null);
  const [castingForm, setCastingForm] = useState<CastingComposerForm | null>(null);
  const [containerForm, setContainerForm] = useState<ProjectComposerForm | null>(null);

  const casting = castingWorkflow?.primaryCasting ?? null;
  const hasCasting = Boolean(casting);

  useEffect(() => {
    if (!open) return;

    const roles = enrichRolesWithCounts(
      castingWorkflow?.roles ?? [],
      castingWorkflow?.candidates ?? [],
    );
    const nextCasting = buildWorkspaceCastingForm(projectId, project, casting, roles);
    setCastingForm(nextCasting);
    setContainerForm(buildContainerForm(projectId, project, nextCasting));
    setCoverStoragePath(null);
    setCoverError(null);
    setDeleteOpen(false);
    // Seed only when the modal opens so live parent refreshes do not wipe in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open-gated seed
  }, [open]);

  function handleCastingChange(next: CastingComposerForm) {
    setCastingForm(next);
    setContainerForm((current) => {
      const base = current ?? buildContainerForm(projectId, project, next);
      return syncContainerAndCasting(base, next).container;
    });
  }

  function updateConfiguration(patch: Partial<CastingComposerForm["configuration"]>) {
    if (!castingForm) return;
    handleCastingChange({
      ...castingForm,
      configuration: { ...castingForm.configuration, ...patch },
    });
  }

  function handleCoverChange(url: string, storagePath: string | null) {
    setCoverStoragePath(storagePath);
    setContainerForm((current) => (current ? { ...current, coverImageUrl: url } : current));
    setCastingForm((current) => (current ? { ...current, coverImageUrl: url } : current));
  }

  function handleSave() {
    if (!castingForm || !containerForm) return;

    startTransition(async () => {
      const synced = syncContainerAndCasting(containerForm, castingForm);

      const projectResult = await updateProject({
        ...synced.container,
        projectId,
        projectType: "casting",
        configuration: {
          ...synced.container.configuration,
          composer_draft: project.isDraft,
        },
      });

      if (!projectResult.ok) {
        showToast({ message: projectResult.error ?? "Could not save project", variant: "error" });
        return;
      }

      if (synced.casting.castingId) {
        const castingResult = await saveProjectCastingChanges(projectId, synced.casting);
        if (!castingResult.ok) {
          showToast({
            message: castingResult.error ?? "Could not save casting details",
            variant: "error",
          });
          return;
        }
      }

      showToast({ message: "Project updated", variant: "success" });
      onClose();
      router.refresh();
    });
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteProject(projectId);
      if (!result.ok) {
        showToast({ message: result.error ?? "Could not delete project", variant: "error" });
        return;
      }
      showToast({ message: "Project deleted", variant: "success" });
      onClose();
      router.push("/projects");
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Edit project"
        description="Update the project basics."
        size="xl"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="project-create__btn project-create__btn--danger"
              onClick={() => setDeleteOpen(true)}
              disabled={isPending || isDeleting}
            >
              Delete project
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                className="project-create__btn project-create__btn--secondary"
                onClick={onClose}
                disabled={isPending || isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="project-create__btn project-create__btn--primary"
                onClick={handleSave}
                disabled={isPending || isDeleting || !castingForm}
              >
                {isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        }
      >
        {castingForm ? (
          <div className="space-y-8">
            {coverError ? (
              <p className="text-sm text-[var(--danger, #f87171)]" role="alert">
                {coverError}
              </p>
            ) : null}
            <CastingBasicsStep
              form={castingForm}
              onFormChange={handleCastingChange}
              draftSessionId={draftSessionId}
              coverStoragePath={coverStoragePath}
              onCoverChange={handleCoverChange}
              onCoverError={setCoverError}
              hideDescription
            />
            {hasCasting ? (
              <CastingTypeVisibilityStep
                form={castingForm}
                onFormChange={handleCastingChange}
                updateConfiguration={updateConfiguration}
              />
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete project?"
        size="sm"
      >
        <p className="mb-4 text-sm text-white/60">
          This permanently deletes the project and all related castings, activities, and files. This
          cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="project-create__btn project-create__btn--danger"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting…" : "Delete project"}
          </button>
          <button
            type="button"
            className="project-create__btn project-create__btn--secondary"
            onClick={() => setDeleteOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </button>
        </div>
      </Modal>
    </>
  );
}
