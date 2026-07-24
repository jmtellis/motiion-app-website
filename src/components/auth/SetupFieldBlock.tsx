import type { ReactNode } from "react";

/** Consistent label + helper for onboarding input sections. */
export function SetupFieldBlock({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="signup-split-field-block">
      <div className="signup-split-field-block__meta">
        <p className="signup-split-field-block__label">{label}</p>
        {hint ? <p className="signup-split-field-block__hint">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}
