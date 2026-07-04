import type { ReactNode } from "react";

export function SectionHeader({
  title,
  description,
  action,
  count,
  tone = "light",
  size = "default",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  count?: number;
  tone?: "light" | "dark";
  size?: "default" | "dashboard";
}) {
  const isDashboard = size === "dashboard";
  const isDark = tone === "dark" || isDashboard;

  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between ${isDashboard ? "pr-10" : ""}`}>
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <h2
            className={`font-semibold ${
              isDashboard ? "text-2xl" : "text-xl"
            } ${isDark ? "text-white/92" : "text-[var(--ink)]"}`}
          >
            {title}
          </h2>
          {typeof count === "number" ? (
            <span className={`text-sm ${isDark ? "text-white/42" : "text-[var(--ink-soft)]"}`}>{count}</span>
          ) : null}
        </div>
        {description ? (
          <p className={`text-sm ${isDark ? "text-white/50" : "text-[var(--ink-soft)]"}`}>{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}
