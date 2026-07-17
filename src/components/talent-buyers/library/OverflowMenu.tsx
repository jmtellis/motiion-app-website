"use client";

import { MoreHorizontal } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export type OverflowMenuItem = {
  label: string;
  onSelect: () => void;
  danger?: boolean;
};

export function OverflowMenu({
  items,
  label = "More actions",
}: {
  items: OverflowMenuItem[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="library-menu" ref={rootRef}>
      <button
        type="button"
        className="inline-flex size-8 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/75 transition hover:bg-black/55 hover:text-white"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </button>
      {open ? (
        <div id={menuId} role="menu" className="library-menu__panel">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`library-menu__item ${item.danger ? "library-menu__item--danger" : ""}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
