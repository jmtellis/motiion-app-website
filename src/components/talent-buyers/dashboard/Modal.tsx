"use client";

import { X } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Dialog } from "@/components/ui/Dialog";
import "./buyer-ui.css";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: ReactNode;
  placement?: "center" | "drawer";
  alert?: boolean;
};
const SIZE_CLASS = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-3xl" } as const;

export function Modal({ open, onClose, title, description, children, size = "md", footer, placement = "center", alert }: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId} describedBy={description ? descriptionId : undefined} alert={alert}
      className={`buyer-modal-root${placement === "drawer" ? " industry-drawer" : ""}`}>
      <div className={`buyer-modal-panel ${SIZE_CLASS[size]}`}>
        <div className="buyer-modal-header">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="buyer-modal-title">{title}</h2>
            {description ? <p id={descriptionId} className="buyer-modal-description">{description}</p> : null}
          </div>
          <button type="button" className="buyer-modal-close" aria-label={`Close ${title}`} onClick={onClose}>
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="buyer-modal-body">{children}</div>
        {footer ? <div className="buyer-modal-footer">{footer}</div> : null}
      </div>
    </Dialog>
  );
}
