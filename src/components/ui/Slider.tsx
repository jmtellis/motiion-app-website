"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

type SliderProps = {
  label?: ReactNode;
  valueLabel?: ReactNode;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">;

/** Range slider using product accent — used by HeightPicker and similar pickers. */
export function Slider({ label, valueLabel, className = "", ...props }: SliderProps) {
  return (
    <label className={`block space-y-3 ${className}`}>
      {label || valueLabel ? (
        <div className="flex items-center justify-between text-sm text-[var(--ds-text-low)]">
          <span>{label}</span>
          {valueLabel ? (
            <span className="font-semibold text-[var(--ds-text-default)]">{valueLabel}</span>
          ) : null}
        </div>
      ) : null}
      <input
        type="range"
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--ds-border-low)] accent-[var(--ds-primary-500)]"
        {...props}
      />
    </label>
  );
}
