"use client";

import { useId, useRef } from "react";

type UnderlineTabOption<T extends string> = { value: T; label: string; activeLabel?: string; panelId?: string };

export function UnderlineTabs<T extends string>({ options, value, onChange, ariaLabel }: {
  options: UnderlineTabOption<T>[]; value: T; onChange: (value: T) => void; ariaLabel: string;
}) {
  const groupId = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div role="tablist" aria-label={ariaLabel} className="ui-tabs">
      {options.map((option, index) => {
        const active = value === option.value;
        return (
          <button key={option.value} ref={(node) => { buttons.current[index] = node; }} id={`${groupId}-${option.value}`}
            type="button" role="tab" aria-selected={active} aria-controls={option.panelId} tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              const next = event.key === "ArrowRight" ? (index + 1) % options.length
                : event.key === "ArrowLeft" ? (index - 1 + options.length) % options.length
                  : event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : -1;
              if (next < 0) return;
              event.preventDefault();
              buttons.current[next]?.focus();
              onChange(options[next].value);
            }}>
            {active ? (option.activeLabel ?? option.label) : option.label}
          </button>
        );
      })}
    </div>
  );
}
