"use client";

import { useId, useState } from "react";

import { createDefaultProjectComposerForm } from "@/lib/talent-buyers/project-composer-defaults";
import type { ProjectCreateConfig } from "@/lib/talent-buyers/project-create-registry";
import type { ProjectType } from "@/lib/talent-buyers/project-types";
import type { ProjectAttachment, ProjectComposerForm } from "@/types/project";

import { ProjectComposer } from "./ProjectComposer";
import { ProjectSelectionsPanel } from "./ProjectSelectionsPanel";

import "./project-create.css";

export function ProjectCreateShell({
  initialForm,
  mode = "create",
  projectType,
  createConfig,
}: {
  initialForm?: ProjectComposerForm;
  mode?: "create" | "edit";
  projectType?: ProjectType;
  createConfig?: ProjectCreateConfig;
}) {
  const draftSessionId = useId().replace(/:/g, "");
  const [form, setForm] = useState<ProjectComposerForm>(
    () => initialForm ?? createDefaultProjectComposerForm(),
  );
  const [coverStoragePath, setCoverStoragePath] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const lockType = mode === "create" && Boolean(projectType);

  function handleCoverChange(url: string, storagePath: string | null) {
    setCoverStoragePath(storagePath);
    setForm((current) => ({ ...current, coverImageUrl: url }));
  }

  function handleAttachmentAdded(attachment: ProjectAttachment) {
    setForm((current) => ({
      ...current,
      configuration: {
        ...current.configuration,
        attachments: [...current.configuration.attachments, attachment],
      },
    }));
  }

  return (
    <div className="project-create">
      <aside className="project-create__media">
        <ProjectSelectionsPanel
          draftSessionId={draftSessionId}
          form={form}
          onFormChange={setForm}
          coverImageUrl={form.coverImageUrl}
          coverStoragePath={coverStoragePath}
          onCoverChange={handleCoverChange}
          onAttachmentAdded={handleAttachmentAdded}
          onError={setMediaError}
          mode={mode}
          createConfig={createConfig}
          lockType={lockType}
        />
        {mediaError ? <p className="project-create__error">{mediaError}</p> : null}
      </aside>

      <div className="project-create__form">
        <ProjectComposer
          form={form}
          onFormChange={setForm}
          mode={mode}
          draftSessionId={draftSessionId}
          onError={setMediaError}
          createConfig={createConfig}
        />
      </div>
    </div>
  );
}
