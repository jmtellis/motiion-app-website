"use client";

import { useEffect, useId, useRef } from "react";

/**
 * Desktop: centered dialog. Mobile: bottom sheet.
 * Preserves the mental model of iOS sheets without copying mobile chrome.
 */
export function ResponsiveModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center md:items-center md:p-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[var(--ds-radius-sheet)] border border-[var(--ds-border)] bg-[var(--ds-surface)] shadow-2xl outline-none md:rounded-[var(--ds-radius-sheet)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--ds-border)] px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-[var(--ds-text-default)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1.5 text-sm text-[var(--ds-muted)] hover:bg-[var(--ds-surface-raised)] hover:text-[var(--ds-text-default)]"
          >
            Close
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
