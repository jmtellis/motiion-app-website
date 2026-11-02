"use client";

import { FolderInput, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { useRef, useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { assignInboxFileToProject, deleteInboxFile, uploadInboxFile } from "@/app/(buyer-app)/(paid)/projects/buyer-file-inbox-actions";
import { formatBuyerRelativeDate } from "@/lib/talent-buyers/dashboard-data";
import type { BuyerInboxFile } from "@/types/buyer-file-inbox";
import type { ProjectHubSummary } from "@/lib/talent-buyers/projects-hub";
import { Modal } from "./Modal";
import { useToast } from "./ToastProvider";
import { ProLockHint } from "@/components/talent-buyers/billing/ProLockHint";
import { useIndustryProOptional } from "@/components/talent-buyers/billing/IndustryProContext";
import { ProjectAttachmentThumbnail } from "@/components/talent-buyers/project/ProjectAttachmentThumbnail";
import "./projects-hub.css";

function fileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "";
  return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Unassigned files belong to the account; project files live in their workspace. */
export function ProjectsHubFilesSection({ inboxFiles: initialInboxFiles, projects, loadError }: {
  inboxFiles: BuyerInboxFile[];
  projects: ProjectHubSummary[];
  loadError?: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const { openUpgrade } = useIndustryProOptional();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [inboxFiles, setInboxFiles] = useState(initialInboxFiles);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pending, startTransition] = useTransition();
  const [assignFile, setAssignFile] = useState<BuyerInboxFile | null>(null);
  const [deleteFile, setDeleteFile] = useState<BuyerInboxFile | null>(null);
  const assignableProjects = projects.filter((project) => (!project.workKind || project.workKind === "project") && project.status !== "archived");
  const [previousFiles, setPreviousFiles] = useState(initialInboxFiles);
  if (!loadError && previousFiles !== initialInboxFiles) {
    setPreviousFiles(initialInboxFiles); setInboxFiles(initialInboxFiles);
  }

  function report(error: unknown) {
    showToast({ message: error instanceof Error ? error.message : "Could not update this file. Please try again.", variant: "error" });
  }
  function uploadFiles(fileList: FileList | null) {
    if (!fileList?.length || pending || loadError) return;
    const files = Array.from(fileList);
    startTransition(async () => {
      let uploaded = 0;
      for (const file of files) {
        try {
          const data = new FormData(); data.append("file", file);
          const result = await uploadInboxFile(data);
          if (!result.ok) {
            if (result.error.toLowerCase().includes("file storage")) openUpgrade("project_files_storage");
            throw new Error(result.error);
          }
          uploaded++;
          setInboxFiles((current) => [result.file, ...current.filter((item) => item.id !== result.file.id)]);
        } catch (error) { report(error); }
      }
      if (uploaded) showToast({ message: `${uploaded} ${uploaded === 1 ? "file uploaded" : "files uploaded"}. Assign to a project when you are ready.`, variant: "success" });
      router.refresh();
    });
  }
  function openPicker() { if (!pending && !loadError) inputRef.current?.click(); }
  function drag(event: DragEvent, enter: boolean) {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current + (enter ? 1 : -1));
    setIsDragOver(dragDepth.current > 0);
  }
  function assign(projectId: string) {
    if (!assignFile) return;
    startTransition(async () => {
      try {
        const result = await assignInboxFileToProject(assignFile.id, projectId);
        if (!result.ok) throw new Error(result.error);
        setInboxFiles((current) => current.filter((file) => file.id !== assignFile.id));
        setAssignFile(null);
        showToast({ message: "File assigned to project.", variant: "success" });
        router.refresh();
      } catch (error) { report(error); }
    });
  }
  function remove() {
    if (!deleteFile) return;
    startTransition(async () => {
      try {
        const result = await deleteInboxFile(deleteFile.id);
        if (!result.ok) throw new Error(result.error);
        setInboxFiles((current) => current.filter((file) => file.id !== deleteFile.id));
        setDeleteFile(null);
        showToast({ message: "File removed.", variant: "success" });
        router.refresh();
      } catch (error) { report(error); }
    });
  }

  return <section className="projects-hub__files" aria-labelledby="project-inbox-files-heading">
    <div className="projects-hub__files-intro">
      <div><h2 className="projects-hub__empty-title" id="project-inbox-files-heading">Unassigned files</h2><p className="projects-hub__files-caption">Keep materials here, then move them into a project.</p></div>
      <button type="button" className="bd-btn-secondary projects-hub__files-add" onClick={openPicker} disabled={pending || Boolean(loadError)}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <><ProLockHint /><Paperclip size={16} aria-hidden /></>} {pending ? "Updating…" : "Add files"}
      </button>
    </div>
    <input ref={inputRef} type="file" multiple className="sr-only" tabIndex={-1} aria-label="Upload project files" onChange={(event) => { uploadFiles(event.target.files); event.target.value = ""; }} />
    {loadError ? <div className="projects-hub__files-empty-note" role="alert"><p>{loadError}</p><button type="button" className="bd-btn-secondary" onClick={() => router.refresh()}>Try again</button></div> : <div
      className={`projects-hub__files-drop${isDragOver ? " projects-hub__files-drop--active" : ""}`}
      onDragEnter={(event) => drag(event, true)} onDragLeave={(event) => drag(event, false)}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
      onDrop={(event) => { event.preventDefault(); dragDepth.current = 0; setIsDragOver(false); uploadFiles(event.dataTransfer.files); }}>
      {!inboxFiles.length ? <button type="button" className="projects-hub__files-dropzone" onClick={openPicker} disabled={pending}>
        <Upload size={24} aria-hidden /><span className="projects-hub__files-dropzone-title">Drop files here or choose files</span>
        <span className="projects-hub__files-dropzone-meta">Briefs, references, and other project materials</span>
      </button> : <ul className="projects-hub__files-list">{inboxFiles.map((file) => <li key={file.id} className="projects-hub__files-item">
        <div className="projects-hub__files-item-media">
          <a href={file.fileUrl} target="_blank" rel="noreferrer" className="projects-hub__files-item-preview" aria-label={`Open ${file.title}`}>
            <ProjectAttachmentThumbnail url={file.fileUrl} contentType={file.contentType} fileName={file.fileName} title={file.title} className="project-attachment-thumb--card" />
          </a>
          <div className="projects-hub__files-item-actions">
            <button type="button" className="projects-hub__files-action" onClick={() => setAssignFile(file)} disabled={pending || !assignableProjects.length} title={assignableProjects.length ? "Assign to project" : "Create a project to assign this file"}><FolderInput size={16} aria-hidden /><span>Assign</span></button>
            <button type="button" className="projects-hub__files-action projects-hub__files-action--danger" disabled={pending} onClick={() => setDeleteFile(file)} aria-label={`Remove ${file.title}`}><Trash2 size={16} aria-hidden /></button>
          </div>
        </div>
        <div className="projects-hub__files-item-body"><a href={file.fileUrl} target="_blank" rel="noreferrer" className="projects-hub__files-item-link"><span className="projects-hub__files-item-title">{file.title}</span><span className="projects-hub__files-item-meta">{[file.fileName, fileSize(file.sizeBytes), formatBuyerRelativeDate(file.createdAt)].filter(Boolean).join(" · ")}</span></a></div>
      </li>)}</ul>}
    </div>}
    <Modal open={Boolean(assignFile)} onClose={() => { if (!pending) setAssignFile(null); }} title="Assign to project" description={assignFile ? `Move “${assignFile.title}” into a project.` : undefined} size="sm">
      <ul className="projects-hub__assign-list">{assignableProjects.map((project) => <li key={project.id}><button type="button" className="projects-hub__assign-item" disabled={pending} onClick={() => assign(project.id)}><span className="projects-hub__assign-item-title">{project.title}</span><span className="projects-hub__assign-item-meta">{project.status === "draft" ? "Draft" : "Active"}</span></button></li>)}</ul>
    </Modal>
    <Modal open={Boolean(deleteFile)} onClose={() => { if (!pending) setDeleteFile(null); }} title="Remove this file?" description={deleteFile ? `“${deleteFile.title}” will be removed from your unassigned files. This cannot be undone.` : undefined} size="sm" footer={<><button className="bd-btn-secondary" disabled={pending} onClick={() => setDeleteFile(null)}>Keep file</button><button className="bd-btn-danger" disabled={pending} onClick={remove}>{pending ? "Removing…" : "Remove file"}</button></>}><p>Files already assigned to a project are managed in that project.</p></Modal>
  </section>;
}
