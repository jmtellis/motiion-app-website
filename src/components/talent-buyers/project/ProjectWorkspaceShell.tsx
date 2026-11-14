"use client";

import { useState, type ReactNode } from "react";
import { isCastingFullyFinalized } from "@/lib/talent-buyers/casting/casting-completion";

import { EditCastingProjectModal } from "@/components/talent-buyers/casting/EditCastingProjectModal";
import { useRegisterBuyerChrome } from "@/components/talent-buyers/dashboard/BuyerPageChromeContext";
import { CASTING_KIND_OPTIONS } from "@/lib/talent-buyers/casting-composer-defaults";
import { labelFromSnake } from "@/lib/talent-buyers/dashboard-data";
import type { CastingConfiguration } from "@/types/casting";

import {
  ProjectCoverAvatar,
  ProjectWorkspaceChromeEnd,
} from "./ProjectWorkspaceChrome";
import { EditProjectShellModal } from "./composable/EditProjectShellModal";
import { ComposableProjectShell } from "./composable/ComposableProjectShell";
import { useProjectWorkspace } from "./ProjectWorkspaceContext";
import { ProjectHeaderActions } from "./ProjectHeaderActions";
import { ProjectWorkspaceTabs } from "./ProjectWorkspaceTabs";
import { ProjectWorkspaceNavigation } from "./ProjectWorkspaceNavigation";
import { ComposableProjectUiContext } from "./composable/ComposableProjectUiContext";

import "@/components/talent-buyers/casting/casting-overview.css";
import "./project-workspace.css";
import "./project-simplified.css";

export function ProjectWorkspaceShell({ children }: { children: ReactNode }) {
  const { project } = useProjectWorkspace();
  if (project.composable) {
    return <ComposableProjectShell composable={project.composable}>{children}</ComposableProjectShell>;
  }
  return <TypedProjectWorkspaceShell>{children}</TypedProjectWorkspaceShell>;
}

function TypedProjectWorkspaceShell({ children }: { children: ReactNode }) {
  const { projectId, project, castingWorkflow } = useProjectWorkspace();
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const castingVisibility = castingWorkflow?.primaryCasting?.visibility;
  const castingLifecycleStatus = castingWorkflow?.primaryCasting?.status;
  const castingFinalized = isCastingFullyFinalized(castingWorkflow?.roles ?? []);
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
      isCastingProject ? <ProjectHeaderActions project={project} castingWorkflow={castingWorkflow} onSettings={() => setSettingsOpen(true)} onEditCasting={() => setEditProjectOpen(true)} /> : <ProjectWorkspaceChromeEnd
        project={project}
        castingStatus={castingLifecycleStatus}
        castingFinalized={castingFinalized}
        onEditProject={() => setEditProjectOpen(true)}
      />
    ),
    revision: `${projectId}:${projectTitle}:${project.isDraft}:${castingVisibility ?? ""}:${
      castingLifecycleStatus ?? ""
    }:${castingFinalized}:${castingTypeLabel}:${unionLabel}:${project.location ?? ""}`,
  });

  return (
    <ComposableProjectUiContext.Provider value={{ openShellEditor: () => setEditProjectOpen(true) }}>
    <div className="project-workspace">
      <section className="project-workspace__panel" aria-label="Project content">
        <div className="project-workspace__sticky-top">
          {isCastingProject ? <ProjectWorkspaceNavigation projectId={projectId} /> : <ProjectWorkspaceTabs />}
        </div>
        {children}
      </section>
      <EditProjectShellModal open={settingsOpen} onClose={() => setSettingsOpen(false)} project={{
        id: projectId, title: project.title, location: project.location, coverImageUrl: project.coverImageUrl,
        details: project.details, archivedAt: null, canArchive: false,
        startDate: typeof project.details?.start_date === "string" ? project.details.start_date : null,
        endDate: typeof project.details?.end_date === "string" ? project.details.end_date : null,
      }} />
      {isCastingProject ? (
        <EditCastingProjectModal
          open={editProjectOpen}
          onClose={() => setEditProjectOpen(false)}
        />
      ) : null}
    </div>
    </ComposableProjectUiContext.Provider>
  );
}
