"use client";

import { useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, GripVertical, X } from "lucide-react";

import { ButtonProgress } from "@/components/auth/ButtonProgress";

import { uploadOnboardingHeadshots } from "@/app/onboarding/media-actions";
import { resizeImageFile } from "@/lib/onboarding/client-media";

import { motion, useReducedMotion } from "motion/react";
import { reorderHeadshots } from "@/lib/onboarding/reorder-headshots";

const MAX_HEADSHOTS = 4;

export function HeadshotUploadGrid({
  headshotUrls,
  headshotOriginalUrls,
  onUploaded,
  onError,
  onBusyChange,
}: {
  headshotUrls: string[];
  headshotOriginalUrls: string[];
  onUploaded: (urls: { headshotUrls: string[]; headshotOriginalUrls: string[] }) => void;
  onError: (message: string | null) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const reduceMotion = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ index: number; x: number; y: number; dx: number; dy: number; target: number } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const filledCount = headshotUrls.length;
  const canAddMore = filledCount < MAX_HEADSHOTS;

  function openPicker() {
    if (!canAddMore || isPending) return;
    inputRef.current?.click();
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;

    const remaining = MAX_HEADSHOTS - filledCount;
    const files = Array.from(fileList).slice(0, remaining).filter((file) => file.type.startsWith("image/"));

    if (!files.length) {
      onError("Choose image files for your headshots.");
      return;
    }

    onError(null);
    onBusyChange?.(true);
    startTransition(async () => {
      try {
        const preparedFiles = await Promise.all(
          files.map(async (file) => {
            const blob = await resizeImageFile(file);
            return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
              type: "image/jpeg",
            });
          }),
        );

        const formData = new FormData();
        formData.append("startSlot", String(headshotUrls.length));
        for (const file of preparedFiles) {
          formData.append("files", file);
        }

        const result = await uploadOnboardingHeadshots(formData);

        if (!result.ok) {
          onError(result.error);
          return;
        }

        onUploaded({
          headshotUrls: [...headshotUrls, ...result.headshotUrls],
          headshotOriginalUrls: [...headshotOriginalUrls, ...result.headshotOriginalUrls],
        });
      } catch (error) {
        onError(error instanceof Error ? error.message : "Headshot upload failed.");
      } finally {
        onBusyChange?.(false);
      }
    });
  }

  function removeRemote(index: number) {
    onUploaded({
      headshotUrls: headshotUrls.filter((_, itemIndex) => itemIndex !== index),
      headshotOriginalUrls: headshotOriginalUrls.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  function moveHeadshot(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= headshotUrls.length) return;

    onUploaded(reorderHeadshots(headshotUrls, headshotOriginalUrls, index, target));
    setAnnouncement(`Headshot moved to position ${target + 1}${target === 0 ? ", primary photo" : ""}.`);
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <div ref={gridRef} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {headshotUrls.map((url, index) => (
          <motion.div
            layout={!reduceMotion}
            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
            animate={{ scale: drag?.index === index ? 1.04 : 1, opacity: drag && drag.index !== index && drag.target !== index ? .65 : 1 }}
            style={{ zIndex: drag?.index === index ? 10 : 0, x: drag?.index === index ? drag.dx : 0, y: drag?.index === index ? drag.dy : 0, boxShadow: drag?.index === index ? "0 16px 35px #0005" : drag?.target === index ? "0 0 0 3px var(--ink)" : "none" }}
            data-photo-index={index}
            key={url}
            className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--tone)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img draggable={false} src={url} alt={`Headshot ${index + 1}`} className="size-full object-cover" />
            <button
              type="button"
              aria-label="Remove headshot"
              disabled={isPending}
              onClick={() => removeRemote(index)}
              className="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-full bg-black/55 text-white"
            >
              <X className="size-4" aria-hidden />
            </button>
            {index === 0 ? (
              <span className="absolute top-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
                Primary
              </span>
            ) : null}
            {headshotUrls.length > 1 ? (
              <div className="absolute right-2 bottom-2 left-2 flex items-center justify-between">
                <button type="button" aria-label={`Drag headshot ${index + 1} to reorder`} disabled={isPending}
                  className="order-2 inline-flex size-9 touch-none cursor-grab items-center justify-center rounded-full bg-black/65 text-white active:cursor-grabbing"
                  onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setDrag({ index, x: event.clientX, y: event.clientY, dx: 0, dy: 0, target: index }); }}
                  onPointerMove={event => { if (!drag) return; const cards = gridRef.current?.querySelectorAll<HTMLElement>("[data-photo-index]"); let target = drag.target; cards?.forEach(card => { const rect = card.getBoundingClientRect(); const candidate = Number(card.dataset.photoIndex); if (candidate !== drag.index && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) target = candidate; }); setDrag({ ...drag, dx: event.clientX - drag.x, dy: event.clientY - drag.y, target }); }}
                  onPointerUp={() => { if (drag) { onUploaded(reorderHeadshots(headshotUrls, headshotOriginalUrls, drag.index, drag.target)); setAnnouncement(`Headshot moved to position ${drag.target + 1}.`); } setDrag(null); }}
                  onPointerCancel={() => setDrag(null)}
                  onKeyDown={event => { if (event.key === "Escape") setDrag(null); if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); moveHeadshot(index, event.key === "ArrowLeft" ? -1 : 1); } }}>
                  <GripVertical className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Move headshot earlier"
                  disabled={isPending || index === 0}
                  onClick={() => moveHeadshot(index, -1)}
                  className="order-1 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white disabled:opacity-30"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Move headshot later"
                  disabled={isPending || index === headshotUrls.length - 1}
                  onClick={() => moveHeadshot(index, 1)}
                  className="order-3 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white disabled:opacity-30"
                >
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              </div>
            ) : null}
          </motion.div>
        ))}

        {canAddMore ? (
          <button
            type="button"
            onClick={openPicker}
            disabled={isPending}
            className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-[var(--line)] shadow-sm bg-[var(--surface-card)] text-sm text-[var(--ink-soft)] transition hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--ink-soft)] hover:bg-[var(--tone)] disabled:opacity-50"
          >
            <ButtonProgress loading={isPending}><span className="flex flex-col items-center gap-2"><ImagePlus className="size-6" aria-hidden /><span>{filledCount === 0 ? "Add headshot" : "Add another"}</span></span></ButtonProgress>
          </button>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">{announcement}</p>
      <p className="text-sm text-[var(--ink-soft)]">
        {filledCount > 0
          ? `${filledCount} of ${MAX_HEADSHOTS} headshots added. Drag the grip to reorder. Your first photo is your primary headshot.`
          : "Add at least one headshot. JPEG or PNG, up to 12 MB each."}
      </p>
    </div>
  );
}
