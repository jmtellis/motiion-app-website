"use client";

import { useEffect, useImperativeHandle, useId, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type Ref } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { SelectOption } from "./select-options";
import "./custom-select.css";

/** One custom picker for Explore, workspace filters, and form fields. */
export function FilterSelect({ value, onChange, options, label, disabled = false, triggerProps, triggerRef, variant = "filter", actionMenu = false }: {
  actionMenu?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  label?: string;
  disabled?: boolean;
  triggerProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  triggerRef?: Ref<HTMLButtonElement>;
  variant?: "filter" | "field";
}) {
  const listId = useId();
  const button = useRef<HTMLButtonElement>(null);
  useImperativeHandle(triggerRef, () => button.current!, []);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const search = useRef({ text: "", at: 0 });
  const visible = options.filter((option) => !option.hidden);
  const selected = options.find((option) => option.value === value);
  const enabled = visible.flatMap((option, index) => option.disabled ? [] : [index]);
  const isDisabled = disabled || enabled.length === 0;

  function show(last = false) {
    if (isDisabled || button.current?.matches(":disabled")) return;
    const index = visible.findIndex((option) => option.value === value && !option.disabled);
    setActive(index >= 0 ? index : (last ? enabled.at(-1) : enabled[0]) ?? 0);
    setOpen(true);
  }

  function choose(index: number) {
    const option = visible[index];
    if (!option || option.disabled) return;
    setOpen(false);
    button.current?.focus({ preventScroll: true });
    if (option.value !== value) onChange(option.value);
  }

  useLayoutEffect(() => {
    if (!open || isDisabled) return;
    const popup = menu.current;
    const trigger = button.current;
    if (!popup || !trigger) return;
    // A custom popover in the top layer avoids clipping in drawers and dialogs.
    const topLayer = typeof popup.showPopover === "function";
    if (topLayer) popup.showPopover();
    else popup.removeAttribute("popover");
    function position() {
      if (!popup || !trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 24);
      const below = window.innerHeight - rect.bottom - 20;
      const above = rect.top - 20;
      const placeAbove = below < 200 && above > below;
      const maxHeight = Math.min(360, Math.max(80, placeAbove ? above : below));
      popup.style.width = `${width}px`;
      popup.style.maxHeight = `${maxHeight}px`;
      popup.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
      popup.style.top = `${placeAbove ? Math.max(12, rect.top - Math.min(popup.scrollHeight, maxHeight) - 8) : rect.bottom + 8}px`;
    }
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      if (topLayer && popup.matches(":popover-open")) popup.hidePopover();
    };
  }, [open, isDisabled, options]);

  useEffect(() => {
    if (!open) return;
    const option = menu.current?.querySelector<HTMLElement>(`[data-option-index="${active}"]`);
    option?.scrollIntoView({ block: "nearest" });
    if (actionMenu) option?.focus({ preventScroll: true });
  }, [active, open, actionMenu]);

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      const target = event.target as Node;
      if (!button.current?.contains(target) && !menu.current?.contains(target)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      button.current?.focus({ preventScroll: true });
    }
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("keydown", escape, true);
    };
  }, [open]);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>) {

        if (event.key === "Tab") { setOpen(false); return; }
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          if (!open) { show(event.key === "ArrowUp" || event.key === "End"); return; }
          const index = enabled.indexOf(active);
          const next = event.key === "Home" ? enabled[0] : event.key === "End" ? enabled.at(-1) : enabled[(index + (event.key === "ArrowDown" ? 1 : -1) + enabled.length) % enabled.length];
          if (next !== undefined) setActive(next);
        } else if (event.key === "Enter" || (event.key === " " && (Date.now() - search.current.at > 700 || !search.current.text))) {
          event.preventDefault();
          if (open) choose(active); else show();
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          const now = Date.now();
          search.current = { text: (now - search.current.at > 700 ? "" : search.current.text) + event.key.toLocaleLowerCase(), at: now };
          const found = visible.findIndex((option) => !option.disabled && option.label.toLocaleLowerCase().startsWith(search.current.text));
          if (found >= 0) { if (open) setActive(found); else if (actionMenu) { setActive(found); setOpen(true); } else onChange(visible[found].value); }
        }
  }

  return <span className={`custom-select custom-select--${variant}`}>
    <button {...triggerProps}
      ref={button}
      type="button" role={actionMenu ? "button" : "combobox"} data-preserve-arrow-focus className={`custom-select__trigger ${triggerProps?.className ?? ""}`}
      disabled={isDisabled} aria-label={triggerProps?.["aria-label"] ?? label}
      aria-expanded={open && !isDisabled} aria-haspopup={actionMenu ? "menu" : "listbox"} aria-controls={open ? listId : undefined}
      aria-activedescendant={!actionMenu && open ? `${listId}-${active}` : undefined}
      onClick={() => open ? setOpen(false) : show()}
      onBlur={(event) => { triggerProps?.onBlur?.(event); if (!menu.current?.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={handleKeyDown}>
      <span className="custom-select__value">{selected?.label ?? "Select…"}</span><ChevronDown size={14} aria-hidden />
    </button>
    {open && !isDisabled ? <div ref={menu} data-preserve-arrow-focus onKeyDown={actionMenu ? handleKeyDown : undefined} id={listId} popover="manual" className="custom-select__menu" role={actionMenu ? "menu" : "listbox"} aria-label={label ?? triggerProps?.["aria-label"] ?? "Options"} onPointerDown={(event) => event.preventDefault()}>
      {visible.map((option, index) => <div key={`${option.value}-${index}`} role="presentation">
        {option.group && (index === 0 || visible[index - 1].group !== option.group) ? <div className="custom-select__group" role="presentation">{option.group}</div> : null}
        <div tabIndex={actionMenu ? -1 : undefined} role={actionMenu ? "menuitem" : "option"} id={`${listId}-${index}`} data-option-index={index} aria-selected={actionMenu ? undefined : option.value === value} aria-disabled={option.disabled || undefined}
          className="custom-select__option" data-active={active === index || undefined}
          onPointerMove={() => { if (!option.disabled) setActive(index); }} onClick={(event) => { event.preventDefault(); event.stopPropagation(); choose(index); }}>
          <span>{option.label}</span>{option.value === value ? <Check size={15} aria-hidden /> : null}
        </div>
      </div>)}
    </div> : null}
  </span>;
}
