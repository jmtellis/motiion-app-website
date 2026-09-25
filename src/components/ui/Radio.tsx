"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

type RadioProps = {
  label: ReactNode;
  description?: ReactNode;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">;

/** Labeled radio using product tokens. */
export function Radio({ label, description, className = "", ...props }: RadioProps) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 ${className}`}>
      <input
        type="radio"
        className="mt-0.5 size-4 shrink-0 cursor-pointer border-[var(--ds-border-default)] bg-[var(--ds-surface-default)] accent-[var(--ds-primary-500)]"
        {...props}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[var(--ds-text-default)]">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-[var(--ds-text-low)]">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
