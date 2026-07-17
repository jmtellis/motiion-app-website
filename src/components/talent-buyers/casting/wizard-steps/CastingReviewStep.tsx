"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";

import { CastingBreakdownDocumentView } from "@/components/talent-buyers/casting/CastingBreakdownDocumentView";
import { CastingBasicsStep } from "@/components/talent-buyers/casting/wizard-steps/CastingBasicsStep";
import { CastingCompensationStep } from "@/components/talent-buyers/casting/wizard-steps/CastingCompensationStep";
import { CastingRoleStep } from "@/components/talent-buyers/casting/wizard-steps/CastingRoleStep";
import { CastingScheduleStep } from "@/components/talent-buyers/casting/wizard-steps/CastingScheduleStep";
import { CastingSubmissionStep } from "@/components/talent-buyers/casting/wizard-steps/CastingSubmissionStep";
import { CastingTypeVisibilityStep } from "@/components/talent-buyers/casting/wizard-steps/CastingTypeVisibilityStep";
import { CastingWhereStep } from "@/components/talent-buyers/casting/wizard-steps/CastingWhereStep";
import { buildCastingBreakdownDocumentFromForm } from "@/lib/talent-buyers/casting/casting-breakdown-document";
import type { CastingComposerForm } from "@/types/casting";

import "@/components/talent-buyers/casting/casting-workspace.css";

type EditSectionId =
  | "general_info"
  | "schedule"
  | "where"
  | "compensation"
  | "submission"
  | "roles";

const SECTION_CHIP_LABELS: Record<string, { id: EditSectionId; label: string }> = {
  "Location & schedule": { id: "where", label: "Location & Schedule" },
  Compensation: { id: "compensation", label: "Compensation" },
  "How to apply": { id: "submission", label: "Submission" },
  Roles: { id: "roles", label: "Roles" },
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

export function CastingReviewStep({
  form,
  onFormChange,
  mode = "create",
}: {
  form: CastingComposerForm;
  onFormChange: (form: CastingComposerForm) => void;
  mode?: "create" | "edit";
}) {
  const [editing, setEditing] = useState<EditSectionId | null>(null);
  const document = buildCastingBreakdownDocumentFromForm(form);
  const title = form.title.trim() || "Untitled Casting";
  const description =
    form.description.trim() ||
    (mode === "edit"
      ? "Review your casting in plain language. Edit anything from the chips, then save your changes."
      : "Review your casting in plain language. Edit anything from the chips, then publish when it looks right.");

  function updateConfiguration(patch: Partial<CastingComposerForm["configuration"]>) {
    onFormChange({
      ...form,
      configuration: { ...form.configuration, ...patch },
    });
  }

  function openEdit(section: EditSectionId) {
    setEditing(section);
  }

  function closeEdit() {
    setEditing(null);
  }

  if (editing) {
    return (
      <div className="casting-breakdown-review casting-breakdown-review--editing">
        <div className="casting-breakdown-review__editor">
          <div className="casting-breakdown-review__editor-header">
            <h3 className="casting-breakdown-review__editor-title">
              {editing === "general_info"
                ? "Edit General Info"
                : editing === "schedule"
                  ? "Edit Schedule"
                  : editing === "where"
                    ? "Edit Location"
                    : editing === "compensation"
                      ? "Edit Compensation"
                      : editing === "submission"
                        ? "Edit Submission"
                        : "Edit Roles"}
            </h3>
            <button type="button" className="casting-breakdown-review__done" onClick={closeEdit}>
              Done
              <X className="size-3.5" aria-hidden />
            </button>
          </div>

          {editing === "general_info" ? (
            <div className="space-y-8">
              <CastingBasicsStep form={form} onFormChange={onFormChange} />
              <CastingTypeVisibilityStep
                form={form}
                onFormChange={onFormChange}
                updateConfiguration={updateConfiguration}
              />
            </div>
          ) : null}

          {editing === "schedule" || editing === "where" ? (
            <div className="space-y-6">
              <CastingWhereStep
                form={form}
                onFormChange={onFormChange}
                updateConfiguration={updateConfiguration}
              />
              <CastingScheduleStep
                form={form}
                onFormChange={onFormChange}
                updateConfiguration={updateConfiguration}
              />
            </div>
          ) : null}

          {editing === "compensation" ? (
            <CastingCompensationStep
              form={form}
              onFormChange={onFormChange}
              updateConfiguration={updateConfiguration}
            />
          ) : null}

          {editing === "submission" ? (
            <CastingSubmissionStep form={form} updateConfiguration={updateConfiguration} />
          ) : null}

          {editing === "roles" ? (
            <CastingRoleStep form={form} onFormChange={onFormChange} autoOpenWhenEmpty={false} />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="casting-breakdown-review casting-breakdown-review--document">
      <header className="casting-breakdown-review__sticky">
        <div className="casting-breakdown-review__sticky-copy">
          <p className="casting-breakdown-review__eyebrow">Review casting</p>
          <h1 className="casting-breakdown-review__title">{title}</h1>
          <p className="casting-breakdown-review__subtitle">{description}</p>
        </div>
        <div className="casting-breakdown-review__sticky-meta">
          {document.byline.length > 0 ? (
            <p className="casting-breakdown-review__byline">{document.byline.join(" · ")}</p>
          ) : (
            <span />
          )}
          <SectionEditChip label="General Info" onClick={() => openEdit("general_info")} />
        </div>
      </header>

      <div className="casting-breakdown-review__scroll">
        <CastingBreakdownDocumentView
          document={document}
          sectionsOnly
          renderSectionAction={(sectionTitle) => {
            const chip = SECTION_CHIP_LABELS[sectionTitle];
            if (!chip) return null;
            return <SectionEditChip label={chip.label} onClick={() => openEdit(chip.id)} />;
          }}
        />
      </div>
    </div>
  );
}
