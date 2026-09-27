import type { HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

/** Shared light-workspace primitives. Keep photo overlays outside these surfaces. */
export function IndustryCard({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section className={`industry-card ${className}`} {...props}>
      {children}
    </section>
  );
}

export function IndustryField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="industry-field">
      <span className="industry-field__label">{label}</span>
      {children}
      {hint ? <span className="industry-field__hint">{hint}</span> : null}
    </label>
  );
}

export function IndustryInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`industry-input ${className}`} {...props} />;
}

export function IndustryBadge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "attention";
  children: ReactNode;
}) {
  return (
    <span className={`industry-badge industry-badge--${tone}`}>{children}</span>
  );
}

export function IndustryPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="industry-page-header">
      <div>
        {eyebrow && <p className="industry-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && (
          <p className="industry-page-description">{description}</p>
        )}
      </div>
      {actions && <div className="industry-page-actions">{actions}</div>}
    </header>
  );
}

export function IndustryEmptyState({
  icon,
  title,
  description,
  actions,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="industry-empty">
      <div className="industry-empty__symbol" aria-hidden>
        {icon ?? "✦"}
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {actions && <div className="industry-page-actions">{actions}</div>}
      {children}
    </section>
  );
}

export function IndustryJourney({
  steps,
}: {
  steps: { title: string; description: string }[];
}) {
  return (
    <ol className="industry-journey">
      {steps.map((step, index) => (
        <li key={step.title}>
          <span className="industry-journey__number">{index + 1}</span>
          <div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
