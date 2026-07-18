"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Paperclip, Trash2 } from "lucide-react";

import {
  createProject,
  deleteProject,
  saveProjectDraft,
  updateProject,
} from "@/app/(buyer-app)/(paid)/projects/actions";
import {
  removeProjectMedia,
  uploadProjectAttachment,
} from "@/app/(buyer-app)/(paid)/projects/project-media-actions";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import type { ProjectCreateConfig } from "@/lib/talent-buyers/project-create-registry";
import { projectCreateLandingPath } from "@/lib/talent-buyers/project-routes";
import { validateProjectForm } from "@/lib/talent-buyers/project-schema";
import type { ProjectAttachment, ProjectComposerForm } from "@/types/project";

import { getCreateMetadata, updateCreateMetadata } from "./ProjectSelectionsPanel";

import "./project-create.css";

const DEFAULT_RIGHT_SECTIONS: ProjectCreateConfig["rightSections"] = [
  "title",
  "description",
  "company",
  "attachments",
];

export function ProjectComposer({
  form: controlledForm,
  onFormChange,
  mode = "create",
  draftSessionId,
  onError,
  createConfig,
}: {
  form: ProjectComposerForm;
  onFormChange: (form: ProjectComposerForm) => void;
  mode?: "create" | "edit";
  draftSessionId: string;
  onError?: (message: string | null) => void;
  createConfig?: ProjectCreateConfig;
}) {
  const router = useRouter();
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAttachmentPending, startAttachmentTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const attachments = controlledForm.configuration.attachments;
  const isEditingDraft = mode === "edit" && controlledForm.configuration.composer_draft === true;
  const rightSections = createConfig?.rightSections ?? DEFAULT_RIGHT_SECTIONS;

  function setForm(updater: ProjectComposerForm | ((current: ProjectComposerForm) => ProjectComposerForm)) {
    const next = typeof updater === "function" ? updater(controlledForm) : updater;
    onFormChange(next);
  }

  function reportError(message: string | null) {
    setError(message);
    onError?.(message);
  }

  function landingPath(projectId: string) {
    if (mode === "edit") {
      return projectCreateLandingPath(projectId, controlledForm.projectType);
    }
    return projectCreateLandingPath(projectId, controlledForm.projectType);
  }

  async function handleSaveDraft() {
    reportError(null);
    setNotice(null);
    const validation = validateProjectForm(controlledForm);
    if (validation) {
      reportError(validation);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = controlledForm.projectId
        ? await saveProjectDraft(controlledForm)
        : await createProject(controlledForm, true);

      if (!result.ok) {
        reportError(result.error);
        return;
      }

      setNotice(createConfig?.draftLabel ? `${createConfig.draftLabel}.` : "Draft saved.");
      router.push(landingPath(result.projectId));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePublish() {
    reportError(null);
    setNotice(null);
    const validation = validateProjectForm(controlledForm);
    if (validation) {
      reportError(validation);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = controlledForm.projectId
        ? await updateProject(controlledForm)
        : await createProject(controlledForm, false);

      if (!result.ok) {
        reportError(result.error);
        return;
      }

      setForm((current) => ({
        ...current,
        projectId: result.projectId,
        configuration: { ...current.configuration, composer_draft: false },
      }));
      setNotice(isEditingDraft ? "Project published." : "Project saved.");
      router.push(landingPath(result.projectId));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!controlledForm.projectId) return;

    setIsDeleting(true);
    reportError(null);

    try {
      const result = await deleteProject(controlledForm.projectId);
      if (!result.ok) {
        reportError(result.error);
        return;
      }

      router.push("/projects");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }

  function openAttachmentPicker() {
    if (isAttachmentPending) return;
    attachmentInputRef.current?.click();
  }

  function handleAttachmentFiles(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    reportError(null);
    startAttachmentTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("draftSessionId", draftSessionId);
        formData.append("title", file.name);

        const result = await uploadProjectAttachment(formData);

        if (!result.ok) {
          reportError(result.error);
          return;
        }

        setForm((current) => ({
          ...current,
          configuration: {
            ...current.configuration,
            attachments: [...current.configuration.attachments, result.attachment],
          },
        }));
      } catch (uploadError) {
        reportError(uploadError instanceof Error ? uploadError.message : "Attachment upload failed.");
      }
    });
  }

  async function removeAttachment(attachment: ProjectAttachment) {
    reportError(null);
    setRemovingId(attachment.id);

    const pathMatch = attachment.file_url_string?.match(/project-media\/(.+)$/);
    if (pathMatch?.[1]) {
      await removeProjectMedia(pathMatch[1]);
    }

    setForm((current) => ({
      ...current,
      configuration: {
        ...current.configuration,
        attachments: current.configuration.attachments.filter((item) => item.id !== attachment.id),
      },
    }));
    setRemovingId(null);
  }

  function hasSection(section: ProjectCreateConfig["rightSections"][number]) {
    return rightSections.includes(section);
  }

  const lede =
    createConfig?.lede ??
    (mode === "edit"
      ? isEditingDraft
        ? "This project is still a draft. Publish when you are ready to use it in your workspace."
        : "Update your project details."
      : "Set up your project container, then add castings and activities from the project workspace.");

  const publishLabel =
    mode === "edit"
      ? isEditingDraft
        ? createConfig?.publishLabel ?? "Publish project"
        : "Save changes"
      : createConfig?.publishLabel ?? "Create project";

  const draftLabel = createConfig?.draftLabel ?? "Save draft";

  return (
    <div className="project-create__composer">
      <p className="project-create__lede">{lede}</p>

      {isEditingDraft ? (
        <div className="project-create__status-banner project-create__status-banner--draft">
          Draft — not visible in your projects hub until you publish.
        </div>
      ) : null}

      {notice ? <div className="project-create__notice-banner">{notice}</div> : null}
      {error ? <div className="project-create__error-banner">{error}</div> : null}

      <div className="project-create__fields">
        {hasSection("title") ? (
          <label className="project-create__field">
            <span className="project-create__label">Title</span>
            <input
              className="project-create__input"
              value={controlledForm.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder={createConfig?.titlePlaceholder ?? "Nike Summer Campaign"}
            />
          </label>
        ) : null}

        {hasSection("description") ? (
          <label className="project-create__field">
            <span className="project-create__label">Description</span>
            <textarea
              className="project-create__textarea"
              value={controlledForm.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder={createConfig?.descriptionPlaceholder ?? "What is this project about?"}
            />
          </label>
        ) : null}

        {hasSection("company") ? (
          <label className="project-create__field">
            <span className="project-create__label">Company</span>
            <input
              className="project-create__input"
              value={controlledForm.productionCompany}
              onChange={(event) =>
                setForm((current) => ({ ...current, productionCompany: event.target.value }))
              }
              placeholder={createConfig?.companyPlaceholder ?? "Production company"}
            />
          </label>
        ) : null}

        {hasSection("highlights") && createConfig?.highlights?.length
          ? createConfig.highlights.map((field) => (
              <label key={field.fieldKey} className="project-create__field">
                <span className="project-create__label">{field.label}</span>
                <input
                  className="project-create__input"
                  value={getCreateMetadata(controlledForm, field.fieldKey)}
                  onChange={(event) =>
                    setForm((current) => updateCreateMetadata(current, field.fieldKey, event.target.value))
                  }
                  placeholder={field.placeholder}
                />
              </label>
            ))
          : null}

        {hasSection("attachments") ? (
          <div className="project-create__field">
            <h2 className="project-create__section-title">Attachments</h2>
            <p className="project-create__section-copy">
              Briefs, music, or reference files talent may need for submissions.
            </p>

            {attachments.length ? (
              <ul className="project-create__attachment-list">
                {attachments.map((attachment) => (
                  <li key={attachment.id} className="project-create__attachment-item">
                    <div className="min-w-0">
                      <p className="project-create__attachment-name">{attachment.title}</p>
                      <p className="project-create__attachment-meta">{attachment.content_type ?? "File"}</p>
                    </div>
                    <button
                      type="button"
                      className="project-create__cover-btn"
                      onClick={() => removeAttachment(attachment)}
                      disabled={removingId === attachment.id}
                      aria-label={`Remove ${attachment.title}`}
                    >
                      {removingId === attachment.id ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="size-3.5" aria-hidden />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <button
              type="button"
              className="project-create__add-attachment"
              onClick={openAttachmentPicker}
              disabled={isAttachmentPending}
            >
              {isAttachmentPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Paperclip className="size-3.5" aria-hidden />
              )}
              Add attachment
            </button>

            <input
              ref={attachmentInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="sr-only"
              onChange={(event) => {
                handleAttachmentFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>
        ) : null}
      </div>

      <div className="project-create__actions">
        {mode === "edit" ? (
          <button
            type="button"
            className="project-create__btn project-create__btn--danger"
            onClick={() => setDeleteOpen(true)}
            disabled={isSubmitting || isDeleting}
          >
            Delete project
          </button>
        ) : null}

        <div className="project-create__actions-primary">
          <button
            type="button"
            className="project-create__btn project-create__btn--secondary"
            onClick={handleSaveDraft}
            disabled={isSubmitting || isDeleting}
          >
            {draftLabel}
          </button>
          <button
            type="button"
            className="project-create__btn project-create__btn--primary"
            onClick={handlePublish}
            disabled={isSubmitting || isDeleting}
          >
            {publishLabel}
          </button>
        </div>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete project?"
        size="sm"
      >
        <p className="text-sm text-white/60 mb-4">
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
    </div>
  );
}
