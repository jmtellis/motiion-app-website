"use client";

import { PreviewErrorBoundary } from "./PreviewErrorBoundary";

export function PreviewFrame({
  title,
  path,
  surface = "dark",
  children,
}: {
  title: string;
  path?: string;
  surface?: "dark" | "light";
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)]">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--ds-border)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--ds-text-default)]">{title}</h3>
        {path ? (
          <code className="font-mono text-[11px] text-[var(--ds-muted)]">{path}</code>
        ) : null}
      </header>
      <div
        className={`p-5 ${
          surface === "light" ? "bg-[var(--paper)] text-[var(--ink)]" : "bg-[var(--ds-background)]"
        }`}
      >
        <PreviewErrorBoundary label={title}>{children}</PreviewErrorBoundary>
      </div>
    </section>
  );
}

export function SectionIntro({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8 max-w-2xl">
      <h2 className="text-xl font-semibold tracking-tight text-[var(--ds-text-default)]">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--ds-muted)]">{description}</p>
    </div>
  );
}
