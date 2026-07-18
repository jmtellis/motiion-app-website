"use client";

import { useCallback, useMemo, useState, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { publishProjectCasting, saveProjectCastingDraft } from "@/app/(buyer-app)/(paid)/projects/[id]/castings/actions";
import { SetupFlowFormPanel } from "@/components/auth/SetupFlowFormPanel";
import { AuthButton } from "@/components/auth/ui";
import { CastingBasicsStep } from "@/components/talent-buyers/casting/wizard-steps/CastingBasicsStep";
import { CastingBreakdownReviewStep } from "@/components/talent-buyers/casting/wizard-steps/CastingBreakdownReviewStep";
import { CastingBreakdownUploadStep } from "@/components/talent-buyers/casting/wizard-steps/CastingBreakdownUploadStep";
import { CastingCompensationStep } from "@/components/talent-buyers/casting/wizard-steps/CastingCompensationStep";
import { CastingReviewStep } from "@/components/talent-buyers/casting/wizard-steps/CastingReviewStep";
import { CastingRoleStep } from "@/components/talent-buyers/casting/wizard-steps/CastingRoleStep";
import { CastingScheduleStep } from "@/components/talent-buyers/casting/wizard-steps/CastingScheduleStep";
import { CastingStartStep } from "@/components/talent-buyers/casting/wizard-steps/CastingStartStep";
import { CastingSubmissionStep } from "@/components/talent-buyers/casting/wizard-steps/CastingSubmissionStep";
import { CastingTypeVisibilityStep } from "@/components/talent-buyers/casting/wizard-steps/CastingTypeVisibilityStep";
import { CastingWhereStep } from "@/components/talent-buyers/casting/wizard-steps/CastingWhereStep";
import {
  CASTING_WIZARD_STEP_MAP,
  getIncompleteContentSteps,
  getNextIncompleteStep,
  getNextWizardStep,
  getPreviousIncompleteStep,
  getPreviousWizardStep,
  getWizardProgress,
  isWizardStepPrefilled,
  syncContainerAndCasting,
  validateCastingWizardStep,
  type CastingWizardPath,
  type CastingWizardStepId,
} from "@/lib/talent-buyers/casting-create-wizard";
import {
  createEmptyPrefillSources,
  mergeBreakdownIntoCastingForms,
  type BreakdownPrefillSources,
} from "@/lib/talent-buyers/breakdown-prefill";
import type { ExtractedBreakdownData } from "@/lib/talent-buyers/breakdown-types";
import type { CastingComposerForm } from "@/types/casting";
import type { ProjectAttachment, ProjectComposerForm } from "@/types/project";

import { CastingProjectPreview } from "./CastingProjectPreview";
import "./casting-create-wizard.css";

export function CastingCreateWizard({
  draftSessionId,
  containerForm,
  castingForm,
  onContainerFormChange,
  onCastingFormChange,
  coverStoragePath,
  onCoverChange,
  onAttachmentAdded,
  ensureProjectId,
  onPublished,
  mode = "create",
  closeHref = "/projects",
  draftRedirectHref,
  initialStepId,
}: {
  draftSessionId: string;
  containerForm: ProjectComposerForm;
  castingForm: CastingComposerForm;
  onContainerFormChange: (form: ProjectComposerForm) => void;
  onCastingFormChange: (form: CastingComposerForm) => void;
  coverStoragePath: string | null;
  onCoverChange: (url: string, storagePath: string | null) => void;
  onAttachmentAdded: (attachment: ProjectAttachment) => void;
  ensureProjectId: () => Promise<string | null>;
  onPublished: (projectId: string) => void;
  mode?: "create" | "edit";
  closeHref?: string;
  draftRedirectHref?: string;
  initialStepId?: CastingWizardStepId;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [wizardPath, setWizardPath] = useState<CastingWizardPath>("scratch");
  const [currentStepId, setCurrentStepId] = useState<CastingWizardStepId>(
    () => initialStepId ?? (isEdit ? "basics" : "start"),
  );
  const [prefillSources, setPrefillSources] = useState<BreakdownPrefillSources>(createEmptyPrefillSources);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const stepMeta = CASTING_WIZARD_STEP_MAP[currentStepId];

  const syncedForms = useMemo(
    () => syncContainerAndCasting(containerForm, castingForm),
    [containerForm, castingForm],
  );

  const incompleteSteps = useMemo(
    () => getIncompleteContentSteps(syncedForms.casting),
    [syncedForms.casting],
  );

  const progress = getWizardProgress(
    wizardPath,
    currentStepId,
    wizardPath === "breakdown" ? incompleteSteps : undefined,
  );
  const showProgress = currentStepId !== "start";

  const updateConfiguration = useCallback(
    (patch: Partial<CastingComposerForm["configuration"]>) => {
      onCastingFormChange({
        ...castingForm,
        configuration: { ...castingForm.configuration, ...patch },
      });
    },
    [castingForm, onCastingFormChange],
  );

  const handleCastingChange = useCallback(
    (next: CastingComposerForm) => {
      onCastingFormChange(next);
      const synced = syncContainerAndCasting(containerForm, next);
      onContainerFormChange(synced.container);
    },
    [containerForm, onCastingFormChange, onContainerFormChange],
  );

  const showPrefillBadge = isWizardStepPrefilled(
    currentStepId,
    syncedForms.container,
    syncedForms.casting,
    prefillSources,
  );

  function goToStep(stepId: CastingWizardStepId) {
    setError(null);
    setCurrentStepId(stepId);
  }

  function handleStartPath(path: CastingWizardPath) {
    setWizardPath(path);
    setError(null);
    setCurrentStepId(path === "breakdown" ? "breakdown" : "basics");
  }

  function handleBreakdownExtracted(extracted: ExtractedBreakdownData) {
    const merged = mergeBreakdownIntoCastingForms(containerForm, castingForm, extracted);
    onContainerFormChange(merged.container);
    onCastingFormChange(merged.casting);
    setPrefillSources(merged.prefillSources);
    goToStep("breakdown_review");
  }

  function validateCurrentStep() {
    return validateCastingWizardStep(currentStepId, syncedForms.container, syncedForms.casting);
  }

  function goNext() {
    const validation = validateCurrentStep();
    if (validation) {
      setError(validation);
      return;
    }

    const next =
      wizardPath === "breakdown"
        ? getNextIncompleteStep(syncedForms.casting, currentStepId)
        : getNextWizardStep(wizardPath, currentStepId);

    if (next) {
      goToStep(next);
    }
  }

  function goBack() {
    const previous =
      wizardPath === "breakdown"
        ? getPreviousIncompleteStep(syncedForms.casting, currentStepId)
        : getPreviousWizardStep(wizardPath, currentStepId);

    // Editing skips the create "start" step — never navigate back into it.
    if (!previous || (isEdit && previous === "start")) {
      return;
    }

    goToStep(previous);
  }

  function handleSaveDraft() {
    startTransition(async () => {
      setError(null);
      const titleCheck = validateCastingWizardStep("basics", syncedForms.container, syncedForms.casting);
      if (titleCheck) {
        setError(titleCheck);
        goToStep("basics");
        return;
      }

      const projectId = await ensureProjectId();
      if (!projectId) {
        setError("Give your casting a title before saving.");
        goToStep("basics");
        return;
      }

      const synced = syncContainerAndCasting(containerForm, { ...castingForm, projectId });
      const result = await saveProjectCastingDraft(projectId, synced.casting);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(draftRedirectHref ?? `/projects/${projectId}/overview`);
    });
  }

  function handlePublish() {
    startTransition(async () => {
      setError(null);
      const validation = validateCastingWizardStep("review", syncedForms.container, syncedForms.casting);
      if (validation) {
        setError(validation);
        goToStep("review");
        return;
      }

      const projectId = await ensureProjectId();
      if (!projectId) {
        setError(
          isEdit
            ? "Give your casting a title before saving."
            : "Give your casting a title before publishing.",
        );
        goToStep("basics");
        return;
      }

      const synced = syncContainerAndCasting(containerForm, { ...castingForm, projectId });
      const result = await publishProjectCasting(projectId, {
        ...synced.casting,
        configuration: { ...synced.casting.configuration, composer_draft: false },
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onPublished(projectId);
    });
  }

  const isFirstStep = isEdit
    ? currentStepId === "basics"
    : currentStepId === "start";
  const isReview = currentStepId === "review";
  const isDocumentLayout = currentStepId === "breakdown_review" || currentStepId === "review";
  const stepBlockingError =
    currentStepId === "start" || currentStepId === "breakdown" || currentStepId === "breakdown_review"
      ? null
      : validateCastingWizardStep(currentStepId, syncedForms.container, syncedForms.casting);
  const canContinue = !stepBlockingError;
  const canPublish =
    validateCastingWizardStep("review", syncedForms.container, syncedForms.casting) === null;
  const gapsAfterReview =
    wizardPath === "breakdown"
      ? incompleteSteps.filter((step) => step !== "review")
      : [];
  const continueLabel =
    currentStepId === "breakdown_review"
      ? gapsAfterReview.length > 0
        ? `Continue · ${gapsAfterReview.length} to Fill`
        : isEdit
          ? "Review & Save"
          : "Review & Publish"
      : showPrefillBadge
        ? "Looks Good, Continue"
        : "Continue";

  const panelTitle = isDocumentLayout ? "" : stepMeta.title;
  const panelSubtitle = isDocumentLayout ? undefined : stepMeta.subtitle;

  return (
    <div className="casting-create-wizard flex min-h-0 flex-1 flex-col">
      <aside className="casting-create-wizard__context">
        <div className="casting-create-wizard__context-body">
          <CastingProjectPreview
            form={syncedForms.casting}
            draftSessionId={draftSessionId}
            coverStoragePath={coverStoragePath}
            onCoverChange={onCoverChange}
            onError={setError}
          />

          {wizardPath === "breakdown" && prefillSources.sections.size > 0 ? (
            <p className="casting-create-wizard__breakdown-status">
              Breakdown uploaded — {prefillSources.sections.size} sections prefilled
            </p>
          ) : null}
        </div>
      </aside>

      <div
        className={`casting-create-wizard__form${
          isDocumentLayout ? " casting-create-wizard__form--breakdown-review" : ""
        }${showProgress ? " casting-create-wizard__form--with-progress" : ""}`}
        style={
          showProgress
            ? ({ ["--casting-progress"]: `${progress.percent}%` } as CSSProperties)
            : undefined
        }
      >
        <div className="casting-create-wizard__form-top">
          <Link href={closeHref} className="casting-create-wizard__close">
            Close
            <X className="size-4" aria-hidden />
          </Link>
        </div>

        <SetupFlowFormPanel
          title={panelTitle}
          subtitle={panelSubtitle}
          progressLabel={isEdit ? "Edit Casting" : "Create Casting"}
          showProgressMeta={false}
          error={error}
          footer={
            <div className="casting-create-wizard__footer">
              <div className="casting-create-wizard__footer-start">
                {!isFirstStep ? (
                  <AuthButton type="button" variant="secondary" onClick={goBack} disabled={isPending}>
                    <ChevronLeft className="size-4" />
                    Back
                  </AuthButton>
                ) : null}
              </div>

              <div className="casting-create-wizard__footer-end">
                <AuthButton type="button" variant="secondary" onClick={handleSaveDraft} disabled={isPending}>
                  Save Draft
                </AuthButton>

                {currentStepId === "start" || currentStepId === "breakdown" ? null : !isReview ? (
                  <AuthButton
                    type="button"
                    onClick={goNext}
                    disabled={isPending || !canContinue}
                    title={stepBlockingError ?? undefined}
                  >
                    {continueLabel}
                    <ChevronRight className="size-4" />
                  </AuthButton>
                ) : (
                  <AuthButton
                    type="button"
                    onClick={handlePublish}
                    disabled={isPending || !canPublish}
                    title={
                      canPublish
                        ? undefined
                        : (validateCastingWizardStep("review", syncedForms.container, syncedForms.casting) ??
                          undefined)
                    }
                  >
                    {isEdit ? "Save Changes" : "Publish Casting"}
                  </AuthButton>
                )}
              </div>
            </div>
          }
        >
          {currentStepId === "start" ? <CastingStartStep onSelectPath={handleStartPath} /> : null}

          {currentStepId === "breakdown" ? (
            <CastingBreakdownUploadStep
              draftSessionId={draftSessionId}
              form={containerForm}
              onExtracted={handleBreakdownExtracted}
              onAttachmentAdded={onAttachmentAdded}
              onError={setError}
            />
          ) : null}

          {currentStepId === "breakdown_review" ? (
            <CastingBreakdownReviewStep
              containerForm={containerForm}
              castingForm={castingForm}
              onContainerFormChange={onContainerFormChange}
              onCastingFormChange={onCastingFormChange}
            />
          ) : null}

          {currentStepId === "basics" ? (
            <CastingBasicsStep
              form={syncedForms.casting}
              onFormChange={handleCastingChange}
              showPrefillBadge={showPrefillBadge}
            />
          ) : null}

          {currentStepId === "type_visibility" ? (
            <CastingTypeVisibilityStep
              form={castingForm}
              onFormChange={handleCastingChange}
              updateConfiguration={updateConfiguration}
              showPrefillBadge={showPrefillBadge}
            />
          ) : null}

          {currentStepId === "schedule" ? (
            <CastingScheduleStep
              form={castingForm}
              onFormChange={handleCastingChange}
              updateConfiguration={updateConfiguration}
              showPrefillBadge={showPrefillBadge}
            />
          ) : null}

          {currentStepId === "where" ? (
            <CastingWhereStep
              form={castingForm}
              onFormChange={handleCastingChange}
              updateConfiguration={updateConfiguration}
              showPrefillBadge={showPrefillBadge}
            />
          ) : null}

          {currentStepId === "compensation" ? (
            <CastingCompensationStep
              form={castingForm}
              onFormChange={onCastingFormChange}
              updateConfiguration={updateConfiguration}
              showPrefillBadge={showPrefillBadge}
            />
          ) : null}

          {currentStepId === "submission" ? (
            <CastingSubmissionStep
              form={castingForm}
              updateConfiguration={updateConfiguration}
              showPrefillBadge={showPrefillBadge}
            />
          ) : null}

          {currentStepId === "roles" ? (
            <CastingRoleStep
              form={castingForm}
              onFormChange={handleCastingChange}
              showPrefillBadge={showPrefillBadge}
            />
          ) : null}

          {currentStepId === "review" ? (
            <CastingReviewStep
              form={syncedForms.casting}
              onFormChange={handleCastingChange}
              mode={mode}
            />
          ) : null}
        </SetupFlowFormPanel>
      </div>
    </div>
  );
}
