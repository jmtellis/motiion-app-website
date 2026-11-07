"use client";

import { X } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Dialog } from "@/components/ui/Dialog";

function subscribeMobile(notify: () => void) {
  const media = window.matchMedia("(max-width: 1023px)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}
const isMobile = () => window.matchMedia("(max-width: 1023px)").matches;
const serverMobile = () => false;

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
  persistent = false,
  hideHeader = false,
}: {
  id: string;
  open: boolean;
  title: string;
  onClose: () => void;
  actions?: ReactNode;
  leading?: ReactNode;
  children: ReactNode;
  persistent?: boolean;
  /** Edge-to-edge body — useful when the content owns its own close control. */
  hideHeader?: boolean;
}) {
  const host = useContext(SidePanelHostContext);
  const mobile = useSyncExternalStore(subscribeMobile, isMobile, serverMobile);
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open || mobile) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector("dialog[open], [data-portfolio-dialog]")) return;
      onCloseRef.current();
    }
    const previousFocus = document.activeElement;
    if (!persistent) panelRef.current?.focus({ preventScroll: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (!persistent && previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open, persistent, mobile]);

  if (!host) return null;

  const panel = (
    <aside
      ref={panelRef}
      id={id}
      className={`workspace-frame workspace-side-frame${persistent ? " workspace-side-frame--persistent" : ""}`}
      aria-label={title}
      tabIndex={-1}
      data-open={open}
      data-persistent={persistent}
      inert={!open && !persistent}
    >
      <div className={`workspace-side-panel${hideHeader ? " workspace-side-panel--flush" : ""}`}>
        {hideHeader ? null : (
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
        )}
        <div className="workspace-side-panel__body">{children}</div>
      </div>
    </aside>
  );
  return createPortal(mobile ? <Dialog open={open} onClose={onClose} label={title} className="workspace-panel-dialog">{panel}</Dialog> : panel, host);
}
