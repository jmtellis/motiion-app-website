import type { ReactNode } from "react";
import Link from "next/link";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  children,
  variant = "default",
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  children?: ReactNode;
  variant?: "default" | "dashboard";
}) {
  const isDashboard = variant === "dashboard";
  const panelClass = isDashboard ? "bd-muted-panel" : "ui-muted-panel";

  return (
    <div className={`${panelClass} px-6 py-8 text-center`}>
      <div
        className={`mx-auto mb-4 flex size-11 items-center justify-center rounded-full border ${
          isDashboard ? "border-white/10 bg-white/4 text-white/58" : "border-[var(--line)] bg-white text-[var(--accent-dark)]"
        }`}
      >
        <span className="text-lg font-semibold">+</span>
      </div>
      <h3 className={`text-lg font-semibold ${isDashboard ? "text-white/92" : "text-[var(--ink)]"}`}>{title}</h3>
      <p className={`mx-auto mt-2 max-w-md text-sm leading-relaxed ${isDashboard ? "text-white/50" : "text-[var(--ink-soft)]"}`}>
        {description}
      </p>
      {children}
      {actionLabel && actionHref ? (
        isDashboard ? (
          <Link href={actionHref} className="bd-btn mt-6 inline-flex">
            {actionLabel}
          </Link>
        ) : (
          <Link href={actionHref} className="btn-primary mt-6 inline-flex text-sm">
            {actionLabel}
          </Link>
        )
      ) : null}
    </div>
  );
}
