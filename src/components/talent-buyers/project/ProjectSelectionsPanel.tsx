"use client";

import { createDefaultProjectComposerForm } from "@/lib/talent-buyers/project-composer-defaults";
import {
  PROJECT_TYPE_DESCRIPTIONS,
  PROJECT_TYPE_LABELS,
  type ProjectType,
} from "@/lib/talent-buyers/project-types";
import type { ProjectCreateConfig } from "@/lib/talent-buyers/project-create-registry";
import type { ProjectComposerForm } from "@/types/project";

import { LocationAutocomplete } from "./LocationAutocomplete";
import { ProjectBreakdownUpload } from "./ProjectBreakdownUpload";
import { ProjectDateRangePicker } from "./ProjectDateRangePicker";
import { ProjectCoverPanel } from "./ProjectCoverPanel";

import "./project-create.css";

export function ProjectSelectionsPanel({
  draftSessionId,
  form,
  onFormChange,
  coverImageUrl,
  coverStoragePath,
  onCoverChange,
  onAttachmentAdded,
  onError,
  mode = "create",
  createConfig,
  lockType = false,
}: {
  draftSessionId: string;
  form: ProjectComposerForm;
  onFormChange: (form: ProjectComposerForm) => void;
  coverImageUrl: string;
  coverStoragePath: string | null;
  onCoverChange: (url: string, storagePath: string | null) => void;
  onAttachmentAdded: (attachment: ProjectComposerForm["configuration"]["attachments"][number]) => void;
  onError: (message: string | null) => void;
  mode?: "create" | "edit";
  createConfig?: ProjectCreateConfig;
  lockType?: boolean;
}) {
  const leftSections = createConfig?.leftSections ?? ["cover", "dates", "location"];
  const showTypeSection = mode === "edit" || lockType;

  function setForm(updater: ProjectComposerForm | ((current: ProjectComposerForm) => ProjectComposerForm)) {
    const next = typeof updater === "function" ? updater(form) : updater;
    onFormChange(next);
  }

  function hasSection(section: ProjectCreateConfig["leftSections"][number]) {
    return leftSections.includes(section);
  }

  return (
    <div className="project-create__selections">
      {hasSection("cover") ? (
        <ProjectCoverPanel
          draftSessionId={draftSessionId}
          coverImageUrl={coverImageUrl}
          coverStoragePath={coverStoragePath}
          onCoverChange={onCoverChange}
          onError={onError}
        />
      ) : null}

      {hasSection("breakdown") && form.projectType === "casting" ? (
        <ProjectBreakdownUpload
          draftSessionId={draftSessionId}
          form={form}
          onFormChange={onFormChange}
          onAttachmentAdded={onAttachmentAdded}
          onError={onError}
        />
      ) : null}

      {showTypeSection ? (
        <div className="project-create__field">
          <h2 className="project-create__section-title">Type</h2>
          <div className="project-create__type-locked">
            <p className="project-create__type-locked-label">{PROJECT_TYPE_LABELS[form.projectType]}</p>
            <p className="project-create__type-locked-copy">{PROJECT_TYPE_DESCRIPTIONS[form.projectType]}</p>
            {mode === "edit" ? (
              <p className="project-create__type-locked-note">
                Project type is set at creation and determines the workspace workflow.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {hasSection("dates") ? (
        <div className="project-create__field">
          <h2 className="project-create__section-title">Dates</h2>
          <ProjectDateRangePicker
            startDate={form.startDate}
            endDate={form.endDate}
            onStartDateChange={(value) => setForm((current) => ({ ...current, startDate: value }))}
            onEndDateChange={(value) => setForm((current) => ({ ...current, endDate: value }))}
          />
        </div>
      ) : null}

      {hasSection("location") ? (
        <LocationAutocomplete
          label="Location"
          value={form.location}
          mode="cities"
          placeholder="Los Angeles, CA"
          onChange={(value) => setForm((current) => ({ ...current, location: value }))}
        />
      ) : null}
    </div>
  );
}

export function updateCreateMetadata(
  form: ProjectComposerForm,
  fieldKey: string,
  value: string,
): ProjectComposerForm {
  return {
    ...form,
    configuration: {
      ...form.configuration,
      create_metadata: {
        ...(form.configuration.create_metadata ?? {}),
        [fieldKey]: value,
      },
    },
  };
}

export function getCreateMetadata(form: ProjectComposerForm, fieldKey: string) {
  return form.configuration.create_metadata?.[fieldKey] ?? "";
}

export function seedProjectFormForType(projectType: ProjectType, config: ProjectCreateConfig): ProjectComposerForm {
  const base = createDefaultProjectComposerForm();
  return {
    ...base,
    projectType,
    configuration: {
      ...base.configuration,
      create_metadata: Object.fromEntries(
        (config.highlights ?? []).map((field) => [field.fieldKey, ""]),
      ),
    },
  };
}
