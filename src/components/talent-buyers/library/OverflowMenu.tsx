"use client";

import { MoreHorizontal } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
export type OverflowMenuItem = { label: string; onSelect: () => void; danger?: boolean };
export function OverflowMenu({ items, label = "More actions" }: { items: OverflowMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const initialFocus = useRef(0);
  const menuId = useId();
  useEffect(() => {
    if (!open) return;
    const buttons = rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    buttons?.[initialFocus.current]?.focus();
    function outside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  function close() { setOpen(false); triggerRef.current?.focus(); }
  return <div className="library-menu" ref={rootRef}>
    <button ref={triggerRef} id={`${menuId}-trigger`} type="button" className="library-menu__trigger"
      aria-label={label} aria-expanded={open} aria-haspopup="menu" aria-controls={open ? menuId : undefined}
      onClick={event => { event.preventDefault(); event.stopPropagation(); initialFocus.current = 0; setOpen(value => !value); }}
      onKeyDown={event => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); initialFocus.current = event.key === "ArrowUp" ? items.length - 1 : 0; setOpen(true); } }}>
      <MoreHorizontal className="size-4" aria-hidden />
    </button>
    {open ? <div id={menuId} role="menu" aria-labelledby={`${menuId}-trigger`} className="library-menu__panel"
      onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
        if (event.key === "Tab") { close(); return; }
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
        const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === "ArrowDown" ? (current + 1) % buttons.length : event.key === "ArrowUp" ? (current - 1 + buttons.length) % buttons.length : event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : -1;
        if (next >= 0) { event.preventDefault(); buttons[next]?.focus(); }
      }}>
      {items.map(item => <button key={item.label} type="button" role="menuitem" tabIndex={-1}
        className={`library-menu__item ${item.danger ? "library-menu__item--danger" : ""}`}
        onClick={event => { event.preventDefault(); event.stopPropagation(); close(); item.onSelect(); }}>{item.label}</button>)}
    </div> : null}
  </div>;
}
