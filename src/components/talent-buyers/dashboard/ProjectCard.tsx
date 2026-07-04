import Link from "next/link";

import { formatBuyerRelativeDate, labelFromSnake } from "@/lib/talent-buyers/dashboard-data";
import type { BuyerProjectSummary } from "@/types/talent-buyer-dashboard";

export function ProjectCard({
  project,
  variant = "default",
}: {
  project: BuyerProjectSummary;
  variant?: "default" | "dashboard";
}) {
  const isDashboard = variant === "dashboard";

  return (
    <Link
      href={`/projects/${project.id}`}
      className={isDashboard ? "bd-row-card block" : "ui-card-interactive block p-4"}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-xs font-semibold tracking-[0.14em] uppercase ${
              isDashboard ? "text-white/42" : "text-[var(--accent)]"
            }`}
          >
            {labelFromSnake(project.projectType)}
          </p>
          <h3 className={`mt-1 text-base font-semibold ${isDashboard ? "text-white/92" : "text-[var(--ink)]"}`}>
            {project.title}
          </h3>
        </div>
        <span
          className={`shrink-0 px-2.5 py-1 text-xs font-semibold ${
            isDashboard ? "bd-chip" : "ui-chip text-[var(--ink-soft)]"
          }`}
        >
          {labelFromSnake(project.status)}
        </span>
      </div>
      <dl className={`mt-4 grid grid-cols-2 gap-3 text-sm ${isDashboard ? "text-white/50" : ""}`}>
        <div>
          <dt className={isDashboard ? "text-white/42" : "text-[var(--ink-soft)]"}>Updated</dt>
          <dd className={`font-medium ${isDashboard ? "text-white/80" : "text-[var(--ink)]"}`}>
            {formatBuyerRelativeDate(project.lastUpdated)}
          </dd>
        </div>
        <div>
          <dt className={isDashboard ? "text-white/42" : "text-[var(--ink-soft)]"}>Talent</dt>
          <dd className={`font-medium ${isDashboard ? "text-white/80" : "text-[var(--ink)]"}`}>{project.talentCount}</dd>
        </div>
        {project.notesCount != null ? (
          <div>
            <dt className={isDashboard ? "text-white/42" : "text-[var(--ink-soft)]"}>Notes</dt>
            <dd className={`font-medium ${isDashboard ? "text-white/80" : "text-[var(--ink)]"}`}>{project.notesCount}</dd>
          </div>
        ) : null}
        {project.sharedLinksCount != null ? (
          <div>
            <dt className={isDashboard ? "text-white/42" : "text-[var(--ink-soft)]"}>Shared</dt>
            <dd className={`font-medium ${isDashboard ? "text-white/80" : "text-[var(--ink)]"}`}>
              {project.sharedLinksCount}
            </dd>
          </div>
        ) : null}
      </dl>
    </Link>
  );
}
