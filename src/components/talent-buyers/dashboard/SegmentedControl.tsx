"use client";

import type { ReactNode } from "react";
import "@/components/ui/chips.css";

type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
  /** Optional badge rendered after the label (e.g. Pro chip). */
  badge?: ReactNode;
};

/** Single-select lens switcher, drawn with the shared chip silhouette. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  /** Legacy density hint; chips share one size. */
  hug?: boolean;
  /** Legacy track option; chips size to their labels. */
  equalWidth?: boolean;
  /** Legacy fill option; selected chips are always solid. */
  activeTone?: "accent" | "white";
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="ui-chip-row">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className="ui-chip"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              const index = options.findIndex((item) => item.value === value);
              const next =
                event.key === "ArrowRight" ? (index + 1) % options.length
                : event.key === "ArrowLeft" ? (index - 1 + options.length) % options.length
                : event.key === "Home" ? 0
                : event.key === "End" ? options.length - 1
                : -1;
              if (next < 0) return;
              event.preventDefault();
              onChange(options[next].value);
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
            }}
          >
            {option.label}
            {option.badge}
          </button>
        );
      })}
    </div>
  );
}
