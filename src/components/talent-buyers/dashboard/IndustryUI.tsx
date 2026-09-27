import type { HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

/** Shared light-workspace primitives. Keep photo overlays outside these surfaces. */
export function IndustryCard({ className = "", children, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`industry-card ${className}`} {...props}>{children}</section>;
}

export function IndustryField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="industry-field"><span className="industry-field__label">{label}</span>{children}{hint ? <span className="industry-field__hint">{hint}</span> : null}</label>;
}

export function IndustryInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`industry-input ${className}`} {...props} />;
}

export function IndustryBadge({ tone = "neutral", children }: { tone?: "neutral" | "success" | "attention"; children: ReactNode }) {
  return <span className={`industry-badge industry-badge--${tone}`}>{children}</span>;
}
