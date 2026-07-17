import Link from "next/link";

import { formatBuyerRelativeDate, labelFromSnake } from "@/lib/talent-buyers/dashboard-data";
import { getProjectTypeLabel } from "@/lib/talent-buyers/project-types";
import { resolveBuyerCoverImage } from "@/lib/talent-buyers/stock-images";
import type { BuyerProjectSummary } from "@/types/talent-buyer-dashboard";

import { BuyerCoverImage } from "./BuyerCoverImage";

export function ProjectCard({
  project,
  variant = "default",
}: {
  project: BuyerProjectSummary;
  variant?: "default" | "dashboard" | "workspace";
}) {
  const isDashboard = variant === "dashboard";
  const isWorkspace = variant === "workspace";
  const coverSrc = resolveBuyerCoverImage(project.id, project.coverImageUrl, "project");

  if (isWorkspace) {
    return (
      <Link
        href={`/projects/${project.id}`}
        className="group relative block min-h-[320px] overflow-hidden rounded-xl border border-[#262626] text-white transition-colors hover:border-[#3a3a3a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2dd4bf]"
      >
        <BuyerCoverImage
          src={coverSrc}
          alt=""
          fill
          overlay
          fallbackId={project.id}
          fallbackCategory="project"
        />

        <div className="relative z-10 flex min-h-[320px] flex-col justify-between gap-4 p-5">
          <span className="bd-chip self-end px-2.5 py-1 text-xs font-semibold text-white/80 backdrop-blur-sm">
            {labelFromSnake(project.status)}
          </span>

          <div>
            <p className="font-mono text-xs font-medium tracking-[0.08em] text-[#2dd4bf] uppercase">
              {getProjectTypeLabel(project.projectType)}
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-white/92 group-hover:text-[var(--accent)]">
              {project.title}
            </h3>
            <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/55">
              <div>
                <dt className="text-white/40">Updated</dt>
                <dd className="font-medium text-white/85">{formatBuyerRelativeDate(project.lastUpdated)}</dd>
              </div>
              <div>
                <dt className="text-white/40">Talent</dt>
                <dd className="font-medium text-white/85">{project.talentCount}</dd>
              </div>
              {project.sharedLinksCount != null ? (
                <div>
                  <dt className="text-white/40">Shared</dt>
                  <dd className="font-medium text-white/85">{project.sharedLinksCount}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/projects/${project.id}`}
      className={
        isDashboard
          ? "bd-visual-card bd-interactive-card group block"
          : "ui-card-interactive group block overflow-hidden rounded-[var(--radius-card)]"
      }
    >
      <div className={isDashboard ? "bd-visual-card__media" : "relative"}>
        <BuyerCoverImage
          src={coverSrc}
          alt=""
          aspectRatio="16/9"
          fallbackId={project.id}
          fallbackCategory="project"
        />
        <span
          className={`bd-visual-card__status shrink-0 px-2.5 py-1 text-xs font-semibold ${
            isDashboard ? "bd-chip" : "ui-chip rounded-[var(--radius-chip)] border text-[var(--ink-soft)]"
          }`}
        >
          {labelFromSnake(project.status)}
        </span>
      </div>

      <div className={isDashboard ? "bd-visual-card__body" : "p-4"}>
        <p
          className={`text-xs font-semibold tracking-[0.14em] uppercase ${
            isDashboard ? "text-white/42" : "text-[var(--accent)]"
          }`}
        >
          {getProjectTypeLabel(project.projectType)}
        </p>
        <h3
          className={`mt-1 text-base font-semibold ${
            isDashboard ? "text-white/92 group-hover:text-[var(--accent)]" : "text-[var(--ink)]"
          }`}
        >
          {project.title}
        </h3>
        <dl className={`mt-4 grid grid-cols-2 gap-3 text-sm ${isDashboard ? "text-white/50" : ""}`}>
          <div>
            <dt className={isDashboard ? "text-white/42" : "text-[var(--ink-soft)]"}>Updated</dt>
            <dd className={`font-medium ${isDashboard ? "text-white/80" : "text-[var(--ink)]"}`}>
              {formatBuyerRelativeDate(project.lastUpdated)}
            </dd>
          </div>
          <div>
            <dt className={isDashboard ? "text-white/42" : "text-[var(--ink-soft)]"}>Talent</dt>
            <dd className={`font-medium ${isDashboard ? "text-white/80" : "text-[var(--ink)]"}`}>
              {project.talentCount}
            </dd>
          </div>
          {project.notesCount != null ? (
            <div>
              <dt className={isDashboard ? "text-white/42" : "text-[var(--ink-soft)]"}>Notes</dt>
              <dd className={`font-medium ${isDashboard ? "text-white/80" : "text-[var(--ink)]"}`}>
                {project.notesCount}
              </dd>
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
      </div>
    </Link>
  );
}
