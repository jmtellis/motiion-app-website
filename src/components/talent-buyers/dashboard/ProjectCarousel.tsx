"use client";

import { useMemo } from "react";

import { FeatureCarousel } from "@/components/landing/FeatureCarousel";
import { formatBuyerRelativeDate } from "@/lib/talent-buyers/dashboard-data";
import { getProjectTypeLabel } from "@/lib/talent-buyers/project-types";
import { resolveBuyerCoverImage } from "@/lib/talent-buyers/stock-images";
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
      projects.map((project) => ({
        id: project.id,
        title: project.title,
        description: `${getProjectTypeLabel(project.projectType)} · ${project.talentCount} submissions · Updated ${formatBuyerRelativeDate(project.lastUpdated)}`,
        href: `/projects/${project.id}`,
        image: {
          src: resolveBuyerCoverImage(project.id, project.coverImageUrl, "project"),
          alt: project.title,
        },
      })),
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
