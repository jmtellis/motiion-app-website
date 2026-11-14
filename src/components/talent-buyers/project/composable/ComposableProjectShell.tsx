"use client";

import { isCastingFullyFinalized } from "@/lib/talent-buyers/casting/casting-completion";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { EditCastingProjectModal } from "@/components/talent-buyers/casting/EditCastingProjectModal";
import { useRegisterBuyerChrome } from "@/components/talent-buyers/dashboard/BuyerPageChromeContext";
import {
  hasAbility,
  projectShellSubtitle,
  type ProjectAbilityCounts,
} from "@/lib/talent-buyers/project-abilities";
import {
  projectPath,
} from "@/lib/talent-buyers/project-routes";

import { ProjectHeaderActions } from "../ProjectHeaderActions";
import { ProjectCoverAvatar } from "../ProjectWorkspaceChrome";
import { useProjectWorkspace, type ComposableWorkspaceMeta } from "../ProjectWorkspaceContext";
import { ProjectWorkspaceNavigation } from "../ProjectWorkspaceNavigation";
import { ComposableProjectUiContext, type ComposableProjectUi } from "./ComposableProjectUiContext";
import { EditProjectShellModal } from "./EditProjectShellModal";
import { resolvePendingViewTransition } from "./view-transition";

import "../project-workspace.css";
import "./composable-project.css";
import "../project-simplified.css";

function isCastingRoute(pathname: string, projectId: string) {
  return pathname.startsWith(projectPath(projectId, "workspace"));
}

export function useComposableAbilityCounts(): ProjectAbilityCounts {
  const { castings, castingWorkflow, rosterMembers, activities } = useProjectWorkspace();
  return useMemo(
    () => ({
      castingCount: castings.length,
      castingRoleCount: Math.max(
        castings.reduce((total, casting) => total + casting.roleCount, 0),
        castingWorkflow?.roles.length ?? 0,
      ),
      rosterCount: rosterMembers.length,
      classSessionCount: activities.filter((activity) => activity.eventType === "class").length,
    }),
    [castings, castingWorkflow, rosterMembers, activities],
  );
}

export function ComposableProjectShell({
  composable,
  children,
}: {
  composable: ComposableWorkspaceMeta;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { projectId, project, castingWorkflow } = useProjectWorkspace();
  const [shellEditorOpen, setShellEditorOpen] = useState(false);
  const [castingEditorOpen, setCastingEditorOpen] = useState(false);
  const castingRoute = isCastingRoute(pathname, projectId);
  const counts = useComposableAbilityCounts();
  const castingStatus = castingWorkflow?.primaryCasting?.status;
  const castingFinalized = isCastingFullyFinalized(castingWorkflow?.roles ?? []);
  const projectTitle = project.title || "Untitled project";
  const subtitle = projectShellSubtitle({
    location: project.location,
    startDate: composable.startDate,
    endDate: composable.endDate,
  });

  useEffect(() => {
    resolvePendingViewTransition();
  }, [pathname]);

  const openShellEditor = useCallback(() => { if (project.isOwner !== false) setShellEditorOpen(true); }, [project.isOwner]);
  const ui = useMemo<ComposableProjectUi>(
    () => ({ openShellEditor }),
    [openShellEditor],
  );

  const abilitySignature = composable.abilities.map((ability) => `${ability.id}:${ability.status}`).join(",");

  useRegisterBuyerChrome({
    leading: <ProjectCoverAvatar project={project} size="large" />,
    title: projectTitle,
    lede: subtitle || undefined,
    breadcrumbs: [],
    end: (
      <ProjectHeaderActions
        project={project}
        castingWorkflow={castingWorkflow}
        onSettings={openShellEditor}
        onEditCasting={() => setCastingEditorOpen(true)}
      />
    ),
    revision: `${projectId}:${projectTitle}:${subtitle}:${abilitySignature}:${castingRoute}:${
      castingStatus ?? ""
    }:${castingFinalized}:${castingWorkflow?.roles.length ?? 0}:${composable.archivedAt ?? ""}:${counts.castingCount}:${
      counts.castingRoleCount
    }:${counts.rosterCount}:${counts.classSessionCount}`,
  });

  return (
    <ComposableProjectUiContext.Provider value={ui}>
      <div className="project-workspace composable-project">
        <section className="project-workspace__panel" aria-label="Project content">
          <div className="project-workspace__sticky-top">
            <ProjectWorkspaceNavigation projectId={projectId} />
          </div>
          {children}
        </section>
        <EditProjectShellModal
          open={shellEditorOpen}
          onClose={() => setShellEditorOpen(false)}
          project={{
            id: projectId,
            details: project.details,
            title: project.title,
            location: project.location,
            startDate: composable.startDate,
            endDate: composable.endDate,
            coverImageUrl: project.coverImageUrl,
            archivedAt: composable.archivedAt,
          }}
        />
        {hasAbility(composable.abilities, "casting") ? (
          <EditCastingProjectModal open={castingEditorOpen} onClose={() => setCastingEditorOpen(false)} />
        ) : null}
      </div>
    </ComposableProjectUiContext.Provider>
  );
}
