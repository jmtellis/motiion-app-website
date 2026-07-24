"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";

type UnderlineTabOption<T extends string> = {
  value: T;
  /** Short label shown when inactive. */
  label: string;
  /** Title-style label shown when active (falls back to `label`). */
  activeLabel?: string;
};

export function UnderlineTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: UnderlineTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  const groupId = useId();
  const reducedMotion = useReducedMotion();

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="relative inline-flex flex-wrap items-end gap-0.5"
    >
      {options.map((option) => {
        const active = value === option.value;
        const displayLabel = active ? (option.activeLabel ?? option.label) : option.label;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`relative whitespace-nowrap px-2.5 pb-2 pt-1 text-[1.125rem] leading-[1.2] tracking-[-0.02em] transition-[color,font-weight] duration-200 ease-out ${
              active
                ? "font-semibold text-white"
                : "font-normal text-[var(--buyer-text-soft,rgb(255_255_255/0.55))] hover:text-[#eaeaea]"
            }`}
          >
            {displayLabel}
            {active ? (
              reducedMotion ? (
                <span
                  className="absolute inset-x-2.5 bottom-0 h-0.5 rounded-full bg-[var(--accent)]"
                  aria-hidden
                />
              ) : (
                <motion.span
                  layoutId={`${groupId}-underline`}
                  className="absolute inset-x-2.5 bottom-0 h-0.5 rounded-full bg-[var(--accent)]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  aria-hidden
                />
              )
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
