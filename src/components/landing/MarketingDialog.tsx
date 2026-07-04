"use client";

import { useEffect, useRef, type ReactNode } from "react";

type MarketingDialogProps = {
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  titleId: string;
  descriptionId: string;
  panelClassName?: string;
};

export function MarketingDialog({
  onClose,
  title,
  description,
  children,
  titleId,
  descriptionId,
  panelClassName,
}: MarketingDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!dialog.open) dialog.showModal();

    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      if (dialog.open) dialog.close();
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className="marketing-dialog fixed inset-0 z-[200] m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-4 open:flex open:items-center open:justify-center sm:p-6"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`relative z-10 w-full max-w-md rounded-[20px] border border-[#262626] bg-[#151515] p-5 sm:p-6 ${panelClassName ?? ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-[#8a8a8a] transition hover:bg-[#1e1e1e] hover:text-[#eaeaea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          aria-label="Close"
        >
          <span aria-hidden className="text-xl leading-none">
            ×
          </span>
        </button>

        <h2 id={titleId} className="type-heading-2 pr-10 text-left text-[#fafafa]">
          {title}
        </h2>
        {description ? (
          <p id={descriptionId} className="type-body-lg mt-3 text-left text-pretty text-[#a3a3a3]">
            {description}
          </p>
        ) : null}

        <div className={description ? "mt-6" : "mt-4"}>{children}</div>
      </div>
    </dialog>
  );
}
