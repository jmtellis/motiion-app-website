import Link from "next/link";
import { createElement } from "react";
import { ChevronRight } from "lucide-react";
import { projectCardDate } from "@/lib/talent-buyers/project-card-date";

import { formatBuyerRelativeDate, labelFromSnake } from "@/lib/talent-buyers/dashboard-data";
import {
  getProjectTypeIcon,
  getProjectTypeStockCategory,
} from "@/lib/talent-buyers/project-type-icons";
import { getProjectTypeLabel } from "@/lib/talent-buyers/project-types";
import type { ProjectHubSummary } from "@/lib/talent-buyers/projects-hub";
import { resolveBuyerCoverSrc } from "@/lib/talent-buyers/stock-images";
import type { BuyerProjectSummary } from "@/types/talent-buyer-dashboard";


import { IndustryBadge } from "./IndustryUI";

import { BuyerCoverImage } from "./BuyerCoverImage";

type ProjectCardModel = BuyerProjectSummary &
  Pick<Partial<ProjectHubSummary>, "href" | "workTypeLabel" | "workKind" | "abilities">;

export function ProjectCard({
  project,
  variant = "default",
}: {
  project: ProjectCardModel;
  variant?: "default" | "dashboard" | "workspace" | "archive";
  /** Next dated beat from the Schedule, e.g. "Audition · Oct 3, 6 PM". */
  nextBeatLabel?: string;
}) {
  const isDashboard = variant === "dashboard";
  const isWorkspace = variant === "workspace";
  const stockCategory = getProjectTypeStockCategory(project.projectType);
  const coverSrc = resolveBuyerCoverSrc(project.coverImageUrl, {
    fallbackUrl: project.productionCompanyLogoUrl,
    allowStock: false,
    id: project.id,
    category: stockCategory,
  });
  const typeLabel = project.composable
    ? "Project"
    : (project.workTypeLabel ?? getProjectTypeLabel(project.projectType));
  const TypeIcon = getProjectTypeIcon(project.projectType);
  const href = project.href ?? `/projects/${project.id}`;
  const countLabel =
    project.workKind === "activity" ? "Guests" : project.workKind === "job" ? "People" : "Talent";

  if (isWorkspace) {
    return (
      <Link
        href={href}
        className="industry-photo-surface group relative block min-h-[320px] overflow-hidden rounded-xl border border-[var(--buyer-line)] text-white transition-colors hover:border-white/18 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        <BuyerCoverImage
          src={coverSrc}
          alt=""
          fill
          overlay
          secondarySrc={project.productionCompanyLogoUrl}
          allowStockFallback={false}
        />

        <div className="relative z-10 flex min-h-[320px] flex-col justify-between gap-4 p-5">
          <span className="bd-chip self-end px-2.5 py-1 text-xs font-semibold text-white/80 backdrop-blur-sm">
            {labelFromSnake(project.status)}
          </span>

          <div>
            <p className="font-mono text-xs font-medium tracking-[0.08em] text-[var(--accent)] uppercase">
              {typeLabel}
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
                <dt className="text-white/40">{countLabel}</dt>
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

  const dates = projectCardDate(project.startDate, project.endDate);
  if (isDashboard) {
    return <Link href={href} className="ui-media-card ui-project-card project-active-card" aria-label={`Open ${project.title}${project.status === "draft" ? " (draft)" : ""}`}>
      <span className="ui-media-card__media">
        <BuyerCoverImage src={coverSrc} alt="" fill secondarySrc={project.productionCompanyLogoUrl} allowStockFallback={false} />
        {project.status === "draft" ? <span className="ui-project-card__status"><IndustryBadge>Draft</IndustryBadge></span> : null}
      </span>
      <span className="ui-media-card__body">
        <span className="project-summary-card__type">{createElement(TypeIcon, { size: 14, "aria-hidden": true })}{typeLabel}</span>
        <span className="project-active-card__heading"><h3 className="ui-media-card__title">{project.title}</h3><ChevronRight size={18} aria-hidden /></span>
        <span className="ui-media-card__text">{dates}</span>
      </span>
    </Link>;
  }

  if (variant === "archive") {
    return (
      <Link href={href} className="project-summary-card" aria-label={`Open ${project.title}${project.status === "draft" ? " (draft)" : ""}`}>
        <span className="project-summary-card__thumbnail">
          <BuyerCoverImage src={coverSrc} alt="" fill secondarySrc={project.productionCompanyLogoUrl} allowStockFallback={false} />
        </span>
        <span className="project-summary-card__copy">
          <span className="project-summary-card__type">{createElement(TypeIcon, { size: 14, "aria-hidden": true })}{typeLabel}</span>
          <h3>{project.title}</h3>
          <span className="project-summary-card__meta">{dates}</span>
        </span>
        <span className="project-summary-card__end">
          {project.status === "draft" ? <IndustryBadge>Draft</IndustryBadge> : null}
          <ChevronRight size={18} aria-hidden />
        </span>
      </Link>
    );
  }

  return (
    <Link href={href} className="ui-card-interactive group block overflow-hidden rounded-[var(--radius-card)]">
      <div className="relative">
        <BuyerCoverImage
          src={coverSrc}
          alt=""
          aspectRatio="16/9"
          secondarySrc={project.productionCompanyLogoUrl}
          allowStockFallback={false}
        />
        <span className="bd-visual-card__status shrink-0 rounded-[var(--radius-chip)] border px-2.5 py-1 text-xs font-semibold text-[var(--ink-soft)] ui-chip">
          {labelFromSnake(project.status)}
        </span>
      </div>

      <div className="p-4">
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--accent)] uppercase">{typeLabel}</p>
        <h3 className="mt-1 text-base font-semibold text-[var(--ink)]">{project.title}</h3>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[var(--ink-soft)]">Updated</dt>
            <dd className="font-medium text-[var(--ink)]">{formatBuyerRelativeDate(project.lastUpdated)}</dd>
          </div>
          <div>
            <dt className="text-[var(--ink-soft)]">{countLabel}</dt>
            <dd className="font-medium text-[var(--ink)]">{project.talentCount}</dd>
          </div>
          {project.notesCount != null ? (
            <div>
              <dt className="text-[var(--ink-soft)]">Notes</dt>
              <dd className="font-medium text-[var(--ink)]">{project.notesCount}</dd>
            </div>
          ) : null}
          {project.sharedLinksCount != null ? (
            <div>
              <dt className="text-[var(--ink-soft)]">Shared</dt>
              <dd className="font-medium text-[var(--ink)]">{project.sharedLinksCount}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </Link>
  );
}
