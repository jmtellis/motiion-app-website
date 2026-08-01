import Link from "next/link";

import { formatBuyerRelativeDate, labelFromSnake } from "@/lib/talent-buyers/dashboard-data";
import {
  getProjectTypeAccent,
  getProjectTypeIcon,
  getProjectTypeStockCategory,
} from "@/lib/talent-buyers/project-type-icons";
import { getProjectTypeLabel } from "@/lib/talent-buyers/project-types";
import { resolveBuyerCoverSrc } from "@/lib/talent-buyers/stock-images";
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
  const stockCategory = getProjectTypeStockCategory(project.projectType);
  const coverSrc = resolveBuyerCoverSrc(project.coverImageUrl, {
    fallbackUrl: project.productionCompanyLogoUrl,
    allowStock: isDashboard,
    id: project.id,
    category: stockCategory,
  });
  const typeLabel = getProjectTypeLabel(project.projectType);
  const TypeIcon = getProjectTypeIcon(project.projectType);
  const typeAccent = getProjectTypeAccent(project.projectType);

  if (isWorkspace) {
    return (
      <Link
        href={`/projects/${project.id}`}
        className="group relative block min-h-[320px] overflow-hidden rounded-xl border border-[var(--buyer-line)] text-white transition-colors hover:border-white/18 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
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

  if (isDashboard) {
    return (
      <Link href={`/projects/${project.id}`} className="bd-visual-card bd-interactive-card bd-project-card group block">
        <div className="bd-project-card__media">
          <BuyerCoverImage
            src={coverSrc}
            alt=""
            aspectRatio="16/9"
            overlay
            secondarySrc={project.productionCompanyLogoUrl}
            fallbackId={project.id}
            fallbackCategory={stockCategory}
            allowStockFallback
          />

          <span className="bd-visual-card__status bd-chip shrink-0 px-2.5 py-1 text-xs font-semibold">
            {labelFromSnake(project.status)}
          </span>

          <div className="bd-project-card__overlay">
            <p className="bd-project-card__type-label">{typeLabel}</p>
            <h3 className="bd-project-card__overlay-title">{project.title}</h3>
          </div>
        </div>

        <div className="bd-project-card__footer">
          <span
            className={`bd-project-card__footer-icon bd-project-card__footer-icon--${typeAccent}`}
            aria-hidden
          >
            <TypeIcon className="size-3.5" strokeWidth={2.25} />
          </span>
          <div className="bd-project-card__footer-copy">
            <p className="bd-project-card__footer-title">{project.title}</p>
            <p className="bd-project-card__footer-meta">
              Edited {formatBuyerRelativeDate(project.lastUpdated)}
            </p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/projects/${project.id}`} className="ui-card-interactive group block overflow-hidden rounded-[var(--radius-card)]">
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
            <dt className="text-[var(--ink-soft)]">Talent</dt>
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
