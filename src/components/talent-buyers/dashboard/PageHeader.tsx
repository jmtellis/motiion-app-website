import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  variant = "default",
  showTitle = true,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  variant?: "default" | "dashboard";
  showTitle?: boolean;
}) {
  const isDashboard = variant === "dashboard";

  return (
    <header className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${isDashboard ? "bd-section pb-8" : ""}`}>
      <div className="space-y-2">
        {eyebrow ? (
          <p
            className={`text-xs font-semibold tracking-[0.2em] uppercase ${
              isDashboard ? "text-white/42" : "text-[var(--accent)]"
            }`}
          >
            {eyebrow}
          </p>
        ) : null}
        {showTitle ? (
          <h1
            className={`text-3xl font-semibold tracking-tight md:text-4xl ${
              isDashboard ? "text-white/92" : "text-[var(--ink)]"
            }`}
          >
            {title}
          </h1>
        ) : null}
        {description ? (
          <p
            className={`max-w-2xl text-base leading-relaxed ${
              isDashboard ? "text-white/58" : "text-[var(--ink-soft)]"
            }`}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
