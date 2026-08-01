"use client";

import { FolderInput, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";

import {
  assignInboxFileToProject,
  deleteInboxFile,
  fetchProjectAttachmentsForHub,
  uploadInboxFile,
} from "@/app/(buyer-app)/(paid)/projects/buyer-file-inbox-actions";
import {
  removeAttachmentMedia,
  updateProjectAttachments,
  uploadProjectAttachment,
} from "@/app/(buyer-app)/(paid)/projects/project-media-actions";
import { formatBuyerRelativeDate } from "@/lib/talent-buyers/dashboard-data";
import { getNormalizedProjectType } from "@/lib/talent-buyers/project-types";
import type { BuyerInboxFile } from "@/types/buyer-file-inbox";
import type { ProjectAttachment } from "@/types/project";
import type { ProjectHubSummary } from "@/lib/talent-buyers/projects-hub";

import { Modal } from "./Modal";
import { useToast } from "./ToastProvider";
import type { ProjectsViewMode } from "./ProjectsViewModeContext";
import { ProLockHint } from "@/components/talent-buyers/billing/ProLockHint";
import { useIndustryProOptional } from "@/components/talent-buyers/billing/IndustryProContext";
import { ProjectAttachmentThumbnail } from "@/components/talent-buyers/project/ProjectAttachmentThumbnail";

import "./projects-hub.css";
import "./buyer-empty.css";

function formatFileSize(bytes: number | null | undefined) {
  if (bytes == null || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileMetaLabel(file: { contentType?: string | null; fileName?: string | null; sizeBytes?: number | null }) {
  const parts = [
    file.fileName ?? file.contentType ?? "File",
    formatFileSize(file.sizeBytes),
  ].filter(Boolean);
  return parts.join(" · ");
}

export function ProjectsHubFilesSection({
  viewMode,
  inboxFiles: initialInboxFiles,
  projects,
  focusProjectId,
  skeletonOnly = false,
}: {
  viewMode: ProjectsViewMode;
  inboxFiles: BuyerInboxFile[];
  projects: ProjectHubSummary[];
  focusProjectId: string | null;
  skeletonOnly?: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const { openUpgrade } = useIndustryProOptional();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const [inboxFiles, setInboxFiles] = useState(initialInboxFiles);
  const [projectAttachments, setProjectAttachments] = useState<ProjectAttachment[]>([]);
  const [focusProjectType, setFocusProjectType] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploadPending, startUploadTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [assignFileId, setAssignFileId] = useState<string | null>(null);
  const [isAssigning, startAssignTransition] = useTransition();
  const [isLoadingFocus, setIsLoadingFocus] = useState(false);

  const isBrowse = viewMode === "browse";
  const canUpload = isBrowse || Boolean(focusProjectId);
  const assignFile = inboxFiles.find((file) => file.id === assignFileId) ?? null;

  useEffect(() => {
    setInboxFiles(initialInboxFiles);
  }, [initialInboxFiles]);

  useEffect(() => {
    if (isBrowse || !focusProjectId) {
      setProjectAttachments([]);
      setFocusProjectType(null);
      setIsLoadingFocus(false);
      return;
    }

    let cancelled = false;
    setIsLoadingFocus(true);

    void fetchProjectAttachmentsForHub(focusProjectId).then((result) => {
      if (cancelled) return;
      setIsLoadingFocus(false);
      if (!result.ok) {
        showToast({ message: result.error, variant: "error" });
        setProjectAttachments([]);
        return;
      }
      setProjectAttachments(result.attachments);
      setFocusProjectType(result.projectType);
    });

    return () => {
      cancelled = true;
    };
  }, [focusProjectId, isBrowse, showToast]);

  const uploadFiles = useCallback(
    (fileList: FileList | File[] | null) => {
      const files = fileList ? Array.from(fileList) : [];
      if (!files.length || !canUpload) return;

      startUploadTransition(async () => {
        let nextProjectAttachments = projectAttachments;

        for (const file of files) {
          try {
            if (isBrowse) {
              const formData = new FormData();
              formData.append("file", file);
              const result = await uploadInboxFile(formData);
              if (!result.ok) {
                if (result.error.toLowerCase().includes("file storage")) {
                  openUpgrade("project_files_storage");
                }
                showToast({ message: result.error, variant: "error" });
                continue;
              }
              setInboxFiles((prev) => [result.file, ...prev.filter((item) => item.id !== result.file.id)]);
            } else if (focusProjectId) {
              const formData = new FormData();
              formData.append("file", file);
              formData.append("draftSessionId", focusProjectId);
              formData.append("title", file.name);
              if (getNormalizedProjectType(focusProjectType) === "casting") {
                formData.append("useCastingDocuments", "1");
              }

              const result = await uploadProjectAttachment(formData);
              if (!result.ok) {
                showToast({ message: result.error, variant: "error" });
                continue;
              }

              nextProjectAttachments = [...nextProjectAttachments, result.attachment];
              const persist = await updateProjectAttachments(focusProjectId, nextProjectAttachments);
              if (!persist.ok) {
                showToast({ message: persist.error ?? "Could not save file.", variant: "error" });
                nextProjectAttachments = nextProjectAttachments.filter(
                  (item) => item.id !== result.attachment.id,
                );
                continue;
              }
              setProjectAttachments(nextProjectAttachments);
            }
          } catch (error) {
            showToast({
              message: error instanceof Error ? error.message : "Upload failed.",
              variant: "error",
            });
          }
        }
        router.refresh();
      });
    },
    [
      canUpload,
      focusProjectId,
      focusProjectType,
      isBrowse,
      openUpgrade,
      projectAttachments,
      router,
      showToast,
    ],
  );

  function openPicker() {
    if (!canUpload || isUploadPending) return;
    inputRef.current?.click();
  }

  function onDragEnter(event: DragEvent) {
    if (!canUpload) return;
    event.preventDefault();
    dragDepth.current += 1;
    setIsDragOver(true);
  }

  function onDragLeave(event: DragEvent) {
    if (!canUpload) return;
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragOver(false);
  }

  function onDragOver(event: DragEvent) {
    if (!canUpload) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function onDrop(event: DragEvent) {
    if (!canUpload) return;
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragOver(false);
    uploadFiles(event.dataTransfer.files);
  }

  async function handleDeleteInbox(file: BuyerInboxFile) {
    setBusyId(file.id);
    const result = await deleteInboxFile(file.id);
    setBusyId(null);
    if (!result.ok) {
      showToast({ message: result.error, variant: "error" });
      return;
    }
    setInboxFiles((prev) => prev.filter((item) => item.id !== file.id));
    router.refresh();
  }

  async function handleDeleteProjectAttachment(attachment: ProjectAttachment) {
    if (!focusProjectId) return;
    setBusyId(attachment.id);
    await removeAttachmentMedia(attachment.file_url_string);
    const next = projectAttachments.filter((item) => item.id !== attachment.id);
    const result = await updateProjectAttachments(focusProjectId, next);
    setBusyId(null);
    if (!result.ok) {
      showToast({ message: result.error ?? "Could not remove file.", variant: "error" });
      return;
    }
    setProjectAttachments(next);
    router.refresh();
  }

  function handleAssign(projectId: string) {
    if (!assignFileId) return;
    startAssignTransition(async () => {
      const result = await assignInboxFileToProject(assignFileId, projectId);
      if (!result.ok) {
        showToast({ message: result.error, variant: "error" });
        return;
      }
      setInboxFiles((prev) => prev.filter((item) => item.id !== assignFileId));
      setAssignFileId(null);
      showToast({ message: "File assigned to project.", variant: "success" });
      router.refresh();
    });
  }

  const listedFiles = isBrowse
    ? inboxFiles.map((file) => ({
        id: file.id,
        title: file.title,
        meta: fileMetaLabel({
          contentType: file.contentType,
          fileName: file.fileName,
          sizeBytes: file.sizeBytes,
        }),
        updatedLabel: formatBuyerRelativeDate(file.createdAt),
        href: file.fileUrl,
        contentType: file.contentType,
        fileName: file.fileName,
        kind: "inbox" as const,
        source: file,
      }))
    : projectAttachments.map((attachment) => ({
        id: attachment.id,
        title: attachment.title,
        meta: attachment.file_name ?? attachment.content_type ?? "File",
        updatedLabel: attachment.uploaded_at_iso8601
          ? formatBuyerRelativeDate(attachment.uploaded_at_iso8601)
          : null,
        href: attachment.file_url_string ?? undefined,
        contentType: attachment.content_type,
        fileName: attachment.file_name ?? attachment.title,
        kind: "project" as const,
        source: attachment,
      }));

  const showGhost = listedFiles.length === 0 && !isLoadingFocus;
  const focusUnavailable = !isBrowse && !focusProjectId && !skeletonOnly;

  return (
    <section className="projects-hub__files">
      <div className="projects-hub__files-intro">
        <h2 className="projects-hub__empty-title">
          {isBrowse ? "Files" : focusProjectId ? "Project files" : "Files"}
        </h2>
        {!skeletonOnly ? (
          <button
            type="button"
            className="buyer-chrome-bar__cta projects-hub__files-add"
            onClick={openPicker}
            disabled={!canUpload || isUploadPending}
          >
            {isUploadPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Uploading
              </>
            ) : (
              <>
                <ProLockHint />
                <Paperclip className="size-3.5" aria-hidden />
                Add files
              </>
            )}
          </button>
        ) : null}
      </div>

      {!skeletonOnly ? (
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={(event) => {
            uploadFiles(event.target.files);
            event.target.value = "";
          }}
        />
      ) : null}

      {skeletonOnly ? (
        <div className="projects-hub__files-skeleton" aria-hidden>
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="projects-hub__files-skeleton-row">
              <div className="projects-hub__files-skeleton-main">
                <span className="buyer-empty__bone projects-hub__files-skeleton-title" />
                <span className="buyer-empty__bone projects-hub__files-skeleton-meta" />
              </div>
              <span className="buyer-empty__bone projects-hub__files-skeleton-action" />
            </div>
          ))}
        </div>
      ) : focusUnavailable ? (
        <div className="projects-hub__files-empty-note">
          Focus a live project to manage its files here.
        </div>
      ) : (
        <div
          className={`projects-hub__files-drop${isDragOver ? " projects-hub__files-drop--active" : ""}${
            !canUpload ? " projects-hub__files-drop--disabled" : ""
          }`}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {isLoadingFocus ? (
            <div className="projects-hub__files-loading">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading files…
            </div>
          ) : showGhost ? (
            <div
              className="projects-hub__files-dropzone"
              role="button"
              tabIndex={canUpload && !isUploadPending ? 0 : -1}
              onClick={openPicker}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openPicker();
                }
              }}
              aria-disabled={!canUpload || isUploadPending}
              aria-label="Drop files here or click to upload"
            >
              <span className="projects-hub__files-dropzone-icon" aria-hidden>
                <Upload className="size-6" strokeWidth={1.5} />
              </span>
              <span className="projects-hub__files-dropzone-title">Drag files here</span>
              <span className="projects-hub__files-dropzone-meta">
                {isBrowse
                  ? "Drop anything from your desktop — it will stay here until you assign a project"
                  : "Drop files to add them to this project, or click to browse"}
              </span>
            </div>
          ) : (
            <ul className="projects-hub__files-list">
              {listedFiles.map((item) => (
                <li key={item.id} className="projects-hub__files-item">
                  <div className="projects-hub__files-item-media">
                    {item.href ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="projects-hub__files-item-preview"
                        aria-label={`Open ${item.title}`}
                      >
                        <ProjectAttachmentThumbnail
                          url={item.href}
                          contentType={item.contentType}
                          fileName={item.fileName}
                          title={item.title}
                          className="project-attachment-thumb--card"
                        />
                      </a>
                    ) : (
                      <div className="projects-hub__files-item-preview">
                        <ProjectAttachmentThumbnail
                          url={item.href}
                          contentType={item.contentType}
                          fileName={item.fileName}
                          title={item.title}
                          className="project-attachment-thumb--card"
                        />
                      </div>
                    )}

                    <div
                      className={`projects-hub__files-item-actions${
                        busyId === item.id ? " projects-hub__files-item-actions--busy" : ""
                      }`}
                    >
                      {item.kind === "inbox" ? (
                        <button
                          type="button"
                          className="projects-hub__files-action"
                          onClick={() => setAssignFileId(item.id)}
                          disabled={busyId === item.id || isAssigning || projects.length === 0}
                          title={
                            projects.length === 0
                              ? "Create a project to assign this file"
                              : "Assign to project"
                          }
                        >
                          <FolderInput className="size-3.5" aria-hidden />
                          <span className="projects-hub__files-action-label">Assign</span>
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="projects-hub__files-action projects-hub__files-action--danger"
                        onClick={() => {
                          if (item.kind === "inbox") {
                            void handleDeleteInbox(item.source);
                          } else {
                            void handleDeleteProjectAttachment(item.source);
                          }
                        }}
                        disabled={busyId === item.id}
                        aria-label={`Remove ${item.title}`}
                      >
                        {busyId === item.id ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Trash2 className="size-3.5" aria-hidden />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="projects-hub__files-item-body">
                    <div className="projects-hub__files-item-main">
                      {item.href ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className="projects-hub__files-item-link"
                        >
                          <span className="projects-hub__files-item-title">{item.title}</span>
                          <span className="projects-hub__files-item-meta">
                            {item.meta}
                            {item.updatedLabel ? ` · ${item.updatedLabel}` : null}
                          </span>
                        </a>
                      ) : (
                        <div>
                          <span className="projects-hub__files-item-title">{item.title}</span>
                          <span className="projects-hub__files-item-meta">
                            {item.meta}
                            {item.updatedLabel ? ` · ${item.updatedLabel}` : null}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Modal
        open={Boolean(assignFile)}
        onClose={() => {
          if (!isAssigning) setAssignFileId(null);
        }}
        title="Assign to project"
        description={
          assignFile
            ? `Choose a project for “${assignFile.title}”. The file will move out of your unassigned inbox.`
            : undefined
        }
        size="sm"
      >
        <ul className="projects-hub__assign-list">
          {projects.map((project) => (
            <li key={project.id}>
              <button
                type="button"
                className="projects-hub__assign-item"
                onClick={() => handleAssign(project.id)}
                disabled={isAssigning}
              >
                <span className="projects-hub__assign-item-title">{project.title}</span>
                <span className="projects-hub__assign-item-meta">
                  {project.status === "draft" ? "Draft" : "Live"} · {project.projectType.replaceAll("_", " ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </section>
  );
}
