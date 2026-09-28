"use client";

import { useRef, useState, useTransition } from "react";
import { FileUp, Loader2 } from "lucide-react";

import { processOnboardingResume } from "@/app/onboarding/media-actions";
import { renderPdfPagesToJpegBlobs } from "@/lib/onboarding/client-media";
import type { OnboardingDraft } from "@/types/onboarding";

const RESUME_PHASES = [
  "Uploading resume…",
  "Reading document…",
  "Extracting profile details…",
  "Mapping credits and training…",
] as const;

export function ResumeUploadField({
  resumeUrl,
  onProcessed,
  onError,
  onBusyChange,
}: {
  onBusyChange?: (busy: boolean) => void;
  resumeUrl: string;
  onProcessed: (patch: Partial<OnboardingDraft>) => void;
  onError: (message: string | null) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openPicker() {
    if (isPending) return;
    inputRef.current?.click();
  }

  async function handleFile(file: File | null) {
    if (!file || isPending) return;
    if (file.type !== "application/pdf" && !file.type.startsWith("image/")) { onError("Choose a PDF or image of your resume."); return; }

    if (file.size > 20 * 1024 * 1024) { onError("Choose a resume under 20 MB."); return; }
    onError(null);
    onBusyChange?.(true);
    setFileName(file.name);
    setPhaseIndex(0);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("source", file);

        const isPdf =
          file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

        if (isPdf) {
          setPhaseIndex(1);
          const pages = await renderPdfPagesToJpegBlobs(file);
          pages.forEach((page, index) => {
            formData.append("pages", page, `resume_page_${index + 1}.jpg`);
          });
        }

        setPhaseIndex(2);
        const result = await processOnboardingResume(formData);

        if (!result.ok) {
          onError(result.error);
          setFileName(null);
          return;
        }

        setPhaseIndex(3);
        onProcessed({
          resumeUrl: result.resumeUrl,
          ...result.draftPatch,
        });
        onError(null);
      } catch (error) {
        onError(error instanceof Error ? error.message : "Resume upload failed.");
        setFileName(null);
      } finally { onBusyChange?.(false); }
    });
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="sr-only"
        onChange={(event) => {
          void handleFile(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={openPicker}
        disabled={isPending}
        className="resume-dropzone disabled:opacity-60"
        data-dragging={dragging}
        onDragOver={event => { event.preventDefault(); if (!isPending) setDragging(true); }}
        onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
        onDrop={event => { event.preventDefault(); setDragging(false); void handleFile(event.dataTransfer.files[0] ?? null); }}
      >
        <div className="min-w-0">
          <p className="font-semibold text-[var(--ink)]">
            {fileName ?? (resumeUrl ? "Resume uploaded" : "Drop your resume here")}
          </p>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            {isPending
              ? RESUME_PHASES[Math.min(phaseIndex, RESUME_PHASES.length - 1)]
              : resumeUrl
                ? "Upload a new file to replace and re-parse your resume."
                : "Or click to choose a PDF or image. We’ll fill in your details and credits."}
          </p>
        </div>
        {isPending ? (
          <Loader2 className="size-5 shrink-0 animate-spin text-[var(--ink-soft)]" aria-hidden />
        ) : (
          <FileUp className="size-5 shrink-0 text-[var(--ink-soft)]" aria-hidden />
        )}
      </button>

      {resumeUrl && !isPending ? (
        <a
          href={resumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-[var(--ink-soft)] underline-offset-2 hover:text-[var(--ink)] hover:underline"
        >
          View uploaded resume
        </a>
      ) : null}
    </div>
  );
}
