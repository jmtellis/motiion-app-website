"use client";
import { useRef, type ComponentProps } from "react";

export function ApplicationTextInput({ onClear, ...props }: ComponentProps<"input"> & { onClear: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const populated = String(props.value ?? "").length > 0;
  return <div className="application-text-input">
    <input {...props} ref={input} />
    {populated && <button type="button" className="application-text-input__clear" aria-label={`Clear ${props["aria-label"] ?? "field"}`} disabled={props.disabled} onClick={event => { event.preventDefault(); onClear(); input.current?.focus(); }}>
      <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="currentColor" /><path d="m7 7 6 6m0-6-6 6" fill="none" stroke="#222" strokeWidth="1.8" strokeLinecap="round" /></svg>
    </button>}
  </div>;
}
