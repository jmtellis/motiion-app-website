"use client";

import Link from "next/link";

import { BuyerCoverImage } from "@/components/talent-buyers/dashboard/BuyerCoverImage";
import { CastingProjectChromeActions } from "@/components/talent-buyers/casting/CastingProjectChromeActions";
import type { CastingProjectStatus } from "@/lib/talent-buyers/casting/casting-types";

import { ProjectAddMenuButton } from "./ProjectAddMenuButton";
import type { ProjectWorkspaceMeta } from "./ProjectWorkspaceContext";

export function ProjectCoverAvatar({
  project,
  size = "default",
}: {
  project: ProjectWorkspaceMeta;
  size?: "default" | "large" | "xlarge";
}) {
  return (
    <span
      className={`buyer-chrome-bar__cover-avatar${
        size === "xlarge"
          ? " buyer-chrome-bar__cover-avatar--xlarge"
          : size === "large"
            ? " buyer-chrome-bar__cover-avatar--large"
            : ""
      }`}
      aria-hidden
    >
      <BuyerCoverImage
        src={project.coverImageUrl}
        alt=""
        fill
        secondarySrc={project.productionCompanyLogoUrl}
        allowStockFallback={false}
      />
    </span>
  );
}

export function ProjectWorkspaceChromeEnd({
  project,
  castingStatus,
  onEditProject,
}: {
  project: ProjectWorkspaceMeta;
  castingStatus?: CastingProjectStatus | null;
  onEditProject?: () => void;
}) {
  const isCastingProject = project.projectType === "casting";

  if (isCastingProject) {
    return (
      <CastingProjectChromeActions
        projectId={project.id}
        status={castingStatus}
        onEditProject={onEditProject ?? (() => {})}
      />
    );
  }

  return (
    <>
      <span
        className={`buyer-chrome-bar__status-chip ${
          project.isDraft
            ? "buyer-chrome-bar__status-chip--draft"
            : "buyer-chrome-bar__status-chip--published"
        }`}
      >
        {project.isDraft ? "Draft" : "Published"}
      </span>
      <Link href={`/projects/${project.id}/edit`} className="buyer-chrome-bar__edit-link">
        Edit
      </Link>
      <ProjectAddMenuButton projectId={project.id} projectType={project.projectType} />
    </>
  );
}
