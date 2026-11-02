"use client";

import { useEffect, useRef, type ReactNode } from "react";

let openDialogs = 0;
let previousOverflow = "";

/** Native top-layer dialog: the browser owns focus containment and inertness.
 * Consumers decide whether unsaved changes can close. */
export function Dialog({ open, onClose, children, className = "", labelledBy, describedBy, label, alert = false }: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  describedBy?: string;
  label?: string;
  alert?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const previousFocus = document.activeElement;
    if (openDialogs++ === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    dialog.showModal();
    return () => {
      dialog.close();
      if (--openDialogs === 0) document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);
  // Keep Escape inside the top layer without preventing native cancel, which
  // delegates closure to the consumer's unsaved-change guard.
  return (
    <dialog ref={ref} className={`ui-dialog ${className}`} role={alert ? "alertdialog" : undefined}
      aria-labelledby={labelledBy} aria-describedby={describedBy} aria-label={label}
      onKeyDown={(event) => { if (event.key === "Escape") event.stopPropagation(); }}
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      {open ? children : null}
    </dialog>
  );
}
