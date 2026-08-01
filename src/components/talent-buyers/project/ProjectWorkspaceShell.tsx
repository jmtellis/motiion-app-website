"use client";

import { useState, type ReactNode } from "react";

import { EditCastingProjectModal } from "@/components/talent-buyers/casting/EditCastingProjectModal";
import { useRegisterBuyerChrome } from "@/components/talent-buyers/dashboard/BuyerPageChromeContext";
import { CASTING_KIND_OPTIONS } from "@/lib/talent-buyers/casting-composer-defaults";
import { labelFromSnake } from "@/lib/talent-buyers/dashboard-data";
import type { CastingConfiguration } from "@/types/casting";

import {
  ProjectCoverAvatar,
  ProjectWorkspaceChromeEnd,
} from "./ProjectWorkspaceChrome";
import { useProjectWorkspace } from "./ProjectWorkspaceContext";
import { ProjectWorkspaceTabs } from "./ProjectWorkspaceTabs";

import "@/components/talent-buyers/casting/casting-overview.css";
import "./project-workspace.css";

export function ProjectWorkspaceShell({ children }: { children: ReactNode }) {
  const { projectId, project, castingWorkflow } = useProjectWorkspace();
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const castingVisibility = castingWorkflow?.primaryCasting?.visibility;
  const castingLifecycleStatus = castingWorkflow?.primaryCasting?.status;
  const isCastingProject = project.projectType === "casting";
  const isEventProject = project.projectType === "event";
  const usesStackedChrome = isCastingProject || isEventProject;

  const castingConfiguration = castingWorkflow?.primaryCasting
    ?.configuration as
    | (CastingConfiguration & { _composer_meta?: { is_union?: boolean | null } })
    | undefined;
  const castingKinds = castingConfiguration?.casting_kinds?.length
    ? castingConfiguration.casting_kinds
    : castingConfiguration?.casting_kind
      ? [castingConfiguration.casting_kind]
      : [];
  const castingTypeLabel = castingKinds.length
    ? castingKinds
        .map(
          (kind) =>
            CASTING_KIND_OPTIONS.find((option) => option.value === kind)?.label ??
            labelFromSnake(String(kind)),
        )
        .join(", ")
    : "Casting";
  const unionValue = castingConfiguration?._composer_meta?.is_union;
  const unionLabel =
    unionValue === true ? "Union" : unionValue === false ? "Non-union" : "Union status not set";
  const projectTitle = project.title || "Untitled project";
  const chromeLede = isCastingProject
    ? `${castingTypeLabel} · ${unionLabel}`
    : isEventProject
      ? project.location?.trim() || undefined
      : undefined;

  useRegisterBuyerChrome({
    leading: (
      <ProjectCoverAvatar
        project={project}
        size={isCastingProject ? "xlarge" : usesStackedChrome ? "large" : "default"}
      />
    ),
    title: usesStackedChrome ? projectTitle : undefined,
    lede: chromeLede,
    breadcrumbs: usesStackedChrome
      ? []
      : [
          { label: "Projects", href: "/projects" },
          { label: projectTitle },
        ],
    end: (
      <ProjectWorkspaceChromeEnd
        project={project}
        castingStatus={castingLifecycleStatus}
        onEditProject={() => setEditProjectOpen(true)}
      />
    ),
    revision: `${projectId}:${projectTitle}:${project.isDraft}:${castingVisibility ?? ""}:${
      castingLifecycleStatus ?? ""
    }:${castingTypeLabel}:${unionLabel}:${project.location ?? ""}`,
  });

  return (
    <div className="project-workspace">
      <section className="project-workspace__panel" aria-label="Project content">
        <div className="project-workspace__sticky-top">
          <ProjectWorkspaceTabs />
        </div>
        {children}
      </section>
      {isCastingProject ? (
        <EditCastingProjectModal
          open={editProjectOpen}
          onClose={() => setEditProjectOpen(false)}
        />
      ) : null}
    </div>
  );
}
