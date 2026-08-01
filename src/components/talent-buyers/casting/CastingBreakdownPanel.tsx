"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Pencil } from "lucide-react";

import { saveProjectCastingChanges } from "@/app/(buyer-app)/(paid)/projects/[id]/castings/actions";
import { AuthField, AuthTextArea } from "@/components/auth/ui";
import { EmptyState } from "@/components/talent-buyers/dashboard/EmptyState";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { CreateCastingModal } from "@/components/talent-buyers/project/CreateCastingModal";
import { ProjectAttachmentsManager } from "@/components/talent-buyers/project/ProjectAttachmentsManager";
import { useProjectWorkspace } from "@/components/talent-buyers/project/ProjectWorkspaceContext";
import { buildCastingBreakdownDocument } from "@/lib/talent-buyers/casting/casting-breakdown-document";
import { enrichRolesWithCounts } from "@/lib/talent-buyers/casting/casting-metrics";
import { buildWorkspaceCastingForm } from "@/lib/talent-buyers/casting/workspace-casting-form";
import type { CastingComposerForm } from "@/types/casting";

import { CastingBreakdownDocumentView } from "./CastingBreakdownDocumentView";
import { CastingBreakdownRolesSection } from "./CastingBreakdownRolesSection";
import { CASTING_DESCRIPTION_MAX_CHARS } from "./wizard-steps/CastingBasicsStep";
import { CastingCompensationStep } from "./wizard-steps/CastingCompensationStep";
import { CastingRoleStep } from "./wizard-steps/CastingRoleStep";
import { CastingScheduleStep } from "./wizard-steps/CastingScheduleStep";
import { CastingSubmissionStep } from "./wizard-steps/CastingSubmissionStep";
import { CastingWhereStep } from "./wizard-steps/CastingWhereStep";

import "./casting-overview.css";
import "./casting-workspace.css";
import "@/components/talent-buyers/project/casting-create-wizard.css";
import "@/components/talent-buyers/project/project-create.css";

type EditSectionId =
  | "general_info"
  | "schedule"
  | "where"
  | "compensation"
  | "submission"
  | "roles";

const SECTION_CHIP_LABELS: Record<string, { id: EditSectionId; label: string }> = {
  Overview: { id: "general_info", label: "Description" },
  "Location & schedule": { id: "where", label: "Location & Schedule" },
  "Production and schedule": { id: "where", label: "Location & Schedule" },
  Compensation: { id: "compensation", label: "Compensation" },
  "How to apply": { id: "submission", label: "Submission" },
  Roles: { id: "roles", label: "Roles" },
};

const SECTION_TITLES: Record<EditSectionId, string> = {
  general_info: "Edit Description",
  schedule: "Edit Schedule",
  where: "Edit Location & Schedule",
  compensation: "Edit Compensation",
  submission: "Edit Submission",
  roles: "Edit Roles",
};

function SectionEditChip({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="casting-breakdown-review__section-chip" onClick={onClick}>
      <Pencil className="size-3.5" aria-hidden />
      {label}
    </button>
  );
}

export function CastingBreakdownPanel() {
  const router = useRouter();
  const { showToast } = useToast();
  const { projectId, project, castingWorkflow, attachments } = useProjectWorkspace();
  const [castingOpen, setCastingOpen] = useState(false);
  const [editing, setEditing] = useState<EditSectionId | null>(null);
  const [draftForm, setDraftForm] = useState<CastingComposerForm | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  const workflow = castingWorkflow ?? {
    primaryCasting: null,
    roles: [],
    candidates: [],
    invitations: [],
    referrals: [],
    externalCandidates: [],
    evaluations: [],
  };

  const roles = useMemo(
    () => enrichRolesWithCounts(workflow.roles, workflow.candidates),
    [workflow.roles, workflow.candidates],
  );
  const casting = workflow.primaryCasting;

  const seedForm = useMemo(
    () => (casting ? buildWorkspaceCastingForm(projectId, project, casting, roles) : null),
    [casting, project, projectId, roles],
  );

  const breakdownDocument =
    seedForm && casting
      ? buildCastingBreakdownDocument(seedForm, casting, roles, projectId)
      : null;

  const readinessGaps =
    breakdownDocument?.readiness.filter((item) => !item.ok && item.label !== "Published") ?? [];

  function openEdit(section: EditSectionId) {
    if (!seedForm) return;
    setDraftForm(seedForm);
    setEditing(section);
  }

  useEffect(() => {
    if (!seedForm || editing) return;
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#roles") return;
    openEdit("roles");
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once when seeded with #roles
  }, [seedForm]);

  function cancelEdit() {
    setEditing(null);
    setDraftForm(null);
  }

  function updateConfiguration(patch: Partial<CastingComposerForm["configuration"]>) {
    setDraftForm((current) =>
      current
        ? { ...current, configuration: { ...current.configuration, ...patch } }
        : current,
    );
  }

  function saveEdit() {
    if (!draftForm?.castingId) return;

    startSaveTransition(async () => {
      const result = await saveProjectCastingChanges(projectId, draftForm);
      if (!result.ok) {
        showToast({ message: result.error ?? "Could not save breakdown", variant: "error" });
        return;
      }
      showToast({ message: "Breakdown updated", variant: "success" });
      setEditing(null);
      setDraftForm(null);
      router.refresh();
    });
  }

  if (!casting) {
    return (
      <>
        <div className="project-workspace__panel-body">
          <EmptyState
            variant="dashboard"
            title="No breakdown yet"
            description="Define the casting details, roles, requirements, and submission process."
            actionLabel="Create breakdown"
            onAction={() => setCastingOpen(true)}
          />
        </div>
        <CreateCastingModal projectId={projectId} open={castingOpen} onClose={() => setCastingOpen(false)} />
      </>
    );
  }

  return (
    <>
      <div className="project-workspace__panel-body casting-breakdown-workspace">
        {readinessGaps.length > 0 ? (
          <div className="casting-breakdown-workspace__readiness" role="status">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            <div>
              <p className="casting-breakdown-workspace__readiness-title">Still needed</p>
              <ul className="casting-breakdown-workspace__readiness-list">
                {readinessGaps.map((item) => (
                  <li key={item.label}>{item.label}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {breakdownDocument ? (
          <section className="casting-breakdown-workspace__doc">
            <button
              type="button"
              className="casting-breakdown-workspace__doc-edit"
              aria-label="Edit breakdown"
              title="Edit breakdown"
              onClick={() => openEdit("general_info")}
            >
              <Pencil className="size-4" aria-hidden />
            </button>
            <CastingBreakdownDocumentView
              document={{ ...breakdownDocument, readiness: [] }}
              sectionsOnly
              rolesAfterOverview
              renderSectionAction={(sectionTitle) => {
                const chip = SECTION_CHIP_LABELS[sectionTitle];
                if (!chip) return null;
                return <SectionEditChip label={chip.label} onClick={() => openEdit(chip.id)} />;
              }}
              renderRoles={
                <CastingBreakdownRolesSection
                  projectId={projectId}
                  casting={casting}
                  roles={roles}
                  candidates={workflow.candidates}
                  onEditRoles={() => openEdit("roles")}
                  embedded
                />
              }
            />
          </section>
        ) : null}

        <section className="casting-breakdown-doc__section casting-breakdown-doc__section--wide" aria-labelledby="doc-Files">
          <div className="casting-breakdown-doc__section-heading">
            <h3 id="doc-Files" className="casting-breakdown-doc__section-title">
              <span className="casting-breakdown-doc__section-icon" aria-hidden />
              Files
            </h3>
          </div>
          <div className="casting-breakdown-doc__section-body">
            <ProjectAttachmentsManager
              projectId={projectId}
              projectType={project.projectType}
              initialAttachments={attachments}
              description=""
              emptyTitle="No files yet"
              emptyDescription="Add briefs, music, or reference files for this casting."
            />
          </div>
        </section>
      </div>

      <Modal
        open={Boolean(editing && draftForm)}
        onClose={cancelEdit}
        title={editing ? SECTION_TITLES[editing] : "Edit breakdown"}
        size="xl"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              className="project-create__btn project-create__btn--secondary"
              onClick={cancelEdit}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="project-create__btn project-create__btn--primary"
              onClick={saveEdit}
              disabled={isSaving || !draftForm}
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        {editing && draftForm ? (
          <div className="casting-breakdown-edit-modal">
            {editing === "general_info" ? (
              <AuthField label="Description">
                <AuthTextArea
                  value={draftForm.description}
                  maxLength={CASTING_DESCRIPTION_MAX_CHARS}
                  onChange={(event) =>
                    setDraftForm({
                      ...draftForm,
                      description: event.target.value.slice(0, CASTING_DESCRIPTION_MAX_CHARS),
                    })
                  }
                  placeholder="What dancers should know about this casting."
                />
                <p className="mt-1.5 text-xs text-[var(--ink-soft)] tabular-nums">
                  {draftForm.description.length} / {CASTING_DESCRIPTION_MAX_CHARS}
                </p>
              </AuthField>
            ) : null}

            {editing === "schedule" || editing === "where" ? (
              <div className="space-y-6">
                <CastingWhereStep
                  form={draftForm}
                  onFormChange={setDraftForm}
                  updateConfiguration={updateConfiguration}
                />
                <CastingScheduleStep
                  form={draftForm}
                  onFormChange={setDraftForm}
                  updateConfiguration={updateConfiguration}
                />
              </div>
            ) : null}

            {editing === "compensation" ? (
              <CastingCompensationStep
                form={draftForm}
                onFormChange={setDraftForm}
                updateConfiguration={updateConfiguration}
              />
            ) : null}

            {editing === "submission" ? (
              <CastingSubmissionStep
                form={draftForm}
                updateConfiguration={updateConfiguration}
              />
            ) : null}

            {editing === "roles" ? (
              <CastingRoleStep
                form={draftForm}
                onFormChange={setDraftForm}
                autoOpenWhenEmpty={false}
              />
            ) : null}
          </div>
        ) : null}
      </Modal>

      <CreateCastingModal
        projectId={projectId}
        open={castingOpen}
        onClose={() => {
          setCastingOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
