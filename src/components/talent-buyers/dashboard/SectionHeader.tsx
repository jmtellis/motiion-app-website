import type { ReactNode } from "react";

export function SectionHeader({
  title,
  description,
  action,
  count,
  tone = "light",
  size = "default",
  className = "",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  count?: number;
  tone?: "light" | "dark";
  size?: "default" | "dashboard";
  className?: string;
}) {
  const isDashboard = size === "dashboard";
  const isDark = tone === "dark" || isDashboard;

  if (isDashboard) {
    return (
      <div className={`flex flex-col gap-2 pr-10 sm:flex-row sm:items-baseline sm:justify-between ${className}`.trim()}>
        <div className="space-y-1">
          <h2 className="font-mono text-xs font-medium tracking-[0.08em] text-[#8a8a8a] uppercase">
            {title}
            {typeof count === "number" ? <span className="ml-2 text-[#5a5a5a]">{count}</span> : null}
          </h2>
          {description ? <p className="text-sm text-[#5a5a5a]">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between ${className}`.trim()}>
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <h2 className={`text-xl font-semibold ${isDark ? "text-white/92" : "text-[var(--ink)]"}`}>
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
