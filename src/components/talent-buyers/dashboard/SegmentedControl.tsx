"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";

type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  hug = false,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  /** Prefer a denser control (smaller type / padding). */
  hug?: boolean;
}) {
  const groupId = useId();
  const reducedMotion = useReducedMotion();

  return (
    <nav
      aria-label={ariaLabel}
      className="relative inline-flex w-fit flex-nowrap gap-1 rounded-full bg-[#111111] p-1"
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`relative z-[1] shrink-0 whitespace-nowrap rounded-full font-medium transition-colors ${
              hug ? "px-2.5 py-1 text-xs" : "px-4 py-1.5 text-sm"
            } ${active ? "text-[#fafafa]" : "text-[#8a8a8a] hover:text-[#eaeaea]"}`}
            aria-pressed={active}
          >
            {active ? (
              reducedMotion ? (
                <span
                  className="absolute inset-0 rounded-full bg-[#1e1e1e] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                  aria-hidden
                />
              ) : (
                <motion.span
                  layoutId={`${groupId}-segment-indicator`}
                  className="absolute inset-0 rounded-full bg-[#1e1e1e] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  aria-hidden
                />
              )
            ) : null}
            <span className="relative z-[1]">{option.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
