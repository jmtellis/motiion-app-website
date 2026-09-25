"use client";

import type { ButtonHTMLAttributes } from "react";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "className" | "children">;

/** Toggle switch — MotiionSheetSwitch / toggle analogue for web. */
export function Switch({
  checked,
  onCheckedChange,
  label,
  className = "",
  disabled,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition ${
        checked
          ? "border-[var(--ds-primary-500)] bg-[var(--ds-primary-500)]"
          : "border-[var(--ds-border-default)] bg-[var(--ds-surface-tint)]"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${className}`}
      {...props}
    >
      <span
        className={`inline-block size-5 rounded-full bg-[var(--ds-button-surface-default)] shadow transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
        aria-hidden
      />
    </button>
  );
}
