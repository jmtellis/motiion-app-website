"use client";

import { X } from "lucide-react";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

const SidePanelHostContext = createContext<HTMLElement | null>(null);

export const WorkspaceSidePanelHost = SidePanelHostContext.Provider;

/**
 * Page-owned panel in the workspace's third column (the notifications slot).
 * Rendered into the shell grid so it pushes the main frame the same way.
 */
export function WorkspaceSidePanel({
  id,
  open,
  title,
  onClose,
  actions,
  leading,
  children,
}: {
  id: string;
  open: boolean;
  title: string;
  onClose: () => void;
  actions?: ReactNode;
  leading?: ReactNode;
  children: ReactNode;
}) {
  const host = useContext(SidePanelHostContext);
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector("[data-portfolio-dialog]")) return;
      onCloseRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!host) return null;

  return createPortal(
    <aside
      ref={panelRef}
      id={id}
      className="workspace-frame workspace-side-frame"
      aria-label={title}
      data-open={open}
      inert={!open}
    >
      <div className="workspace-side-panel">
        <header className="workspace-side-panel__header">
          <div className="workspace-side-panel__title">
            {leading}
            <h2>{title}</h2>
          </div>
          <div className="workspace-side-panel__actions">
            {actions}
            <button
              type="button"
              className="workspace-notifications__close"
              aria-label={`Close ${title.toLowerCase()}`}
              onClick={onClose}
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        </header>
        <div className="workspace-side-panel__body">{children}</div>
      </div>
    </aside>,
    host,
  );
}
