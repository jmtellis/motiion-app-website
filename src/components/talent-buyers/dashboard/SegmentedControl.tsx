"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useId } from "react";

type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
  /** Optional badge rendered after the label (e.g. Pro chip). */
  badge?: ReactNode;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  hug = false,
  equalWidth = false,
  activeTone = "accent",
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  /** Prefer a denser control (smaller type / padding). */
  hug?: boolean;
  /** Give every segment the same width (symmetrical track). */
  equalWidth?: boolean;
  /** Selected pill fill. */
  activeTone?: "accent" | "white";
}) {
  const groupId = useId();
  const reducedMotion = useReducedMotion();
  const indicatorClass =
    activeTone === "white"
      ? "absolute inset-0 rounded-full bg-white shadow-none"
      : "absolute inset-0 rounded-full bg-[var(--accent)] shadow-none";

  return (
    <nav
      aria-label={ariaLabel}
      className={
        equalWidth
          ? "relative inline-grid grid-flow-col auto-cols-fr gap-1 rounded-full border border-white/10 bg-white/[0.06] p-1 shadow-none backdrop-blur-[14px]"
          : "relative inline-flex w-fit flex-nowrap gap-1 rounded-full border border-white/10 bg-white/[0.06] p-1 shadow-none backdrop-blur-[14px]"
      }
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`relative z-[1] whitespace-nowrap rounded-full text-center font-medium transition-colors ${
              equalWidth ? "min-w-[5.5rem]" : "shrink-0"
            } ${hug ? "px-2.5 py-1 text-xs" : "px-4 py-1.5 text-sm"} ${
              active
                ? "text-[#0a0a0a]"
                : "text-[var(--buyer-text-soft,rgb(255_255_255/0.55))] hover:text-[#eaeaea]"
            }`}
            aria-pressed={active}
          >
            {active ? (
              reducedMotion ? (
                <span className={indicatorClass} aria-hidden />
              ) : (
                <motion.span
                  layoutId={`${groupId}-segment-indicator`}
                  className={indicatorClass}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  aria-hidden
                />
              )
            ) : null}
            <span className="relative z-[1] inline-flex items-center justify-center leading-none">
              <span className="leading-none">{option.label}</span>
              {option.badge}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
