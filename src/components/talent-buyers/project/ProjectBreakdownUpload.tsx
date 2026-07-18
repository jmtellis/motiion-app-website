"use client";

import { useRef, useState, useTransition } from "react";
import { FileUp, Loader2 } from "lucide-react";

import { processProjectBreakdown } from "@/app/(buyer-app)/(paid)/projects/project-breakdown-actions";
import { renderPdfPagesToJpegBlobs } from "@/lib/onboarding/client-media";
import { mergeBreakdownIntoForm } from "@/lib/talent-buyers/breakdown-prefill";
import type { ProjectAttachment, ProjectComposerForm } from "@/types/project";

const BREAKDOWN_PHASES = [
  "Uploading breakdown…",
  "Reading document…",
  "Extracting project details…",
  "Applying to form…",
] as const;

export function ProjectBreakdownUpload({
  draftSessionId,
  form,
  onFormChange,
  onAttachmentAdded,
  onError,
}: {
  draftSessionId: string;
  form: ProjectComposerForm;
  onFormChange: (form: ProjectComposerForm) => void;
  onAttachmentAdded: (attachment: ProjectAttachment) => void;
  onError: (message: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openPicker() {
    if (isPending) return;
    inputRef.current?.click();
  }

  async function handleFile(file: File | null) {
    if (!file) return;

    onError(null);
    setFileName(file.name);
    setPhaseIndex(0);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("source", file);
        formData.append("draftSessionId", draftSessionId);
        formData.append("title", file.name);
        formData.append("projectType", form.projectType);
        if (form.projectId) {
          formData.append("projectId", form.projectId);
        }

        const isPdf =
          file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

        if (isPdf) {
          setPhaseIndex(1);
          const pages = await renderPdfPagesToJpegBlobs(file);
          pages.forEach((page, index) => {
            formData.append("pages", page, `breakdown_page_${index + 1}.jpg`);
          });
        }

        setPhaseIndex(2);
        const result = await processProjectBreakdown(formData);

        if (!result.ok) {
          onError(result.error);
          setFileName(null);
          return;
        }

        setPhaseIndex(3);
        onFormChange(mergeBreakdownIntoForm(form, result.extracted));

        if (result.attachment) {
          const alreadyAttached = form.configuration.attachments.some(
            (item) => item.id === result.attachment?.id,
          );
          if (!alreadyAttached) {
            onAttachmentAdded(result.attachment);
          }
        }

        onError(null);
      } catch (error) {
        onError(error instanceof Error ? error.message : "Breakdown upload failed.");
        setFileName(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      <h2 className="project-create__section-title">Breakdown</h2>
      <p className="project-create__section-copy">
        Upload a breakdown or brief to prefill project details.
      </p>

      <button
        type="button"
        className="project-create__breakdown-drop"
        onClick={openPicker}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="size-7 animate-spin text-white/60" aria-hidden />
        ) : (
          <FileUp className="size-7 text-white/55" aria-hidden />
        )}
        <span className="project-create__breakdown-drop-title">
          {isPending ? BREAKDOWN_PHASES[phaseIndex] : "Upload breakdown"}
        </span>
        <span className="project-create__breakdown-drop-meta">
          {fileName && !isPending ? fileName : "PDF or image up to 20 MB"}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        onChange={(event) => {
          void handleFile(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />
    </div>
  );
}
