"use client";

import { useMemo } from "react";

import { FeatureCarousel } from "@/components/landing/FeatureCarousel";
import { formatBuyerRelativeDate } from "@/lib/talent-buyers/dashboard-data";
import { getProjectTypeLabel } from "@/lib/talent-buyers/project-types";
import { resolveBuyerCoverSrc } from "@/lib/talent-buyers/stock-images";
import type { ProjectHubSummary } from "@/lib/talent-buyers/projects-hub";

import "./projects-hub.css";

export function ProjectCarousel({
  projects,
  onActiveIndexChange,
}: {
  projects: ProjectHubSummary[];
  onActiveIndexChange?: (index: number) => void;
}) {
  const slides = useMemo(
    () =>
      projects.map((project) => {
        const typeLabel = project.workTypeLabel ?? getProjectTypeLabel(project.projectType);
        const statusLabel =
          project.status === "draft"
            ? "Draft"
            : project.status === "archived"
              ? "Archived"
              : project.workKind === "activity"
                ? `${project.talentCount} guests`
                : project.workKind === "job"
                  ? `${project.talentCount} people`
                  : `${project.talentCount} submissions`;
        const coverSrc = resolveBuyerCoverSrc(project.coverImageUrl, {
          fallbackUrl: project.productionCompanyLogoUrl,
          allowStock: false,
        });
        return {
          id: project.id,
          title: project.title,
          description: `${typeLabel} · ${statusLabel} · Updated ${formatBuyerRelativeDate(project.lastUpdated)}`,
          href: project.href ?? `/projects/${project.id}`,
          ...(coverSrc
            ? {
                image: {
                  src: coverSrc,
                  alt: project.title,
                },
              }
            : {}),
        };
      }),
    [projects],
  );

  if (!slides.length) return null;

  return (
    <FeatureCarousel
      variant="embedded"
      slides={slides}
      onActiveIndexChange={onActiveIndexChange}
      flankWithPlaceholders
      showFooterCopy={false}
      showFooterTitle
      showFooterDescription
      className="projects-hub__carousel"
    />
  );
}
