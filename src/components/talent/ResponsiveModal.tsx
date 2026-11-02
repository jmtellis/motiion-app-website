"use client";

import { useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";

/** Shared native dialog behavior, presented as a bottom sheet on phones. */
export function ResponsiveModal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode;
}) {
  const titleId = useId();
  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId} className="ui-dialog--responsive">
      <div className="ui-dialog-panel">
        <header className="ui-dialog-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" onClick={onClose} className="ui-icon-button" aria-label={`Close ${title}`}><X size={20} aria-hidden /></button>
        </header>
        <div className="ui-dialog-body">{children}</div>
      </div>
    </Dialog>
  );
}
