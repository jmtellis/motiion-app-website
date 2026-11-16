"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { ApplicationTextInput } from "./ApplicationTextInput";

export function ApplicationMultiPicker({ label, placeholder, searchPlaceholder, help, options, selected, disabled, onToggle }: {
  label: string; placeholder: string; searchPlaceholder: string; help: string;
  options: readonly string[]; selected: string[]; disabled: boolean; onToggle: (option: string) => void;
}) {
  const id = useId();
  const disclosure = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    // Label clicks can briefly move focus to the document before focusing the
    // checkbox. Dismiss by pointer location, not that intermediate blur.
    function dismissOutside(event: PointerEvent) {
      if (event.target instanceof Node && disclosure.current && !disclosure.current.contains(event.target)) disclosure.current.open = false;
    }
    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, []);
  const [query, setQuery] = useState("");
  const matches = options.filter(option => option.toLowerCase().includes(query.toLowerCase()));
  return <div className="industry-role-picker signup-split-field">
    <span id={`${id}-label`}>{label}</span>
    <details ref={disclosure} onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }} onKeyDown={event => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
      <summary aria-labelledby={`${id}-label ${id}-value`} aria-describedby={`${id}-help`} onClick={event => { if (disabled) event.preventDefault(); }} aria-disabled={disabled}><span id={`${id}-value`}>{selected.length > 2 ? `${selected.slice(0, 2).join(", ")} +${selected.length - 2}` : selected.length ? selected.join(", ") : placeholder}</span><ChevronDown size={16} aria-hidden /></summary>
      <div className="industry-role-picker__menu">
        <div className="industry-role-picker__search"><Search size={16} aria-hidden /><ApplicationTextInput onClear={() => setQuery("")} aria-label={`Filter ${label.toLowerCase()}`} placeholder={searchPlaceholder} onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }} value={query} disabled={disabled} onChange={event => setQuery(event.target.value)} /></div>
        <div data-lenis-prevent className="industry-role-picker__options" role="group" aria-label={label}>
          {matches.map(option => <label key={option}><input type="checkbox" disabled={disabled} checked={selected.includes(option)} onChange={() => onToggle(option)} /><span>{option}</span></label>)}
          {!matches.length && <p>No matches. Clear your search to choose Other.</p>}
        </div>
        <div className="industry-role-picker__footer" role="status">{selected.length} selected</div>
      </div>
    </details>
    <small id={`${id}-help`} className="signup-split-hint">{help}</small>
  </div>;
}
