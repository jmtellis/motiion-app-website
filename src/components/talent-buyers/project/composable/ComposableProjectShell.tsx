"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";

import { CastingStatusActionButton } from "@/components/talent-buyers/casting/CastingStatusActionButton";
import { EditCastingProjectModal } from "@/components/talent-buyers/casting/EditCastingProjectModal";
import { useRegisterBuyerChrome } from "@/components/talent-buyers/dashboard/BuyerPageChromeContext";
import type { CastingProjectStatus } from "@/lib/talent-buyers/casting/casting-types";
import {
  PROJECT_ABILITIES,
  hasAbility,
  projectShellStatus,
  projectShellSubtitle,
  resolveSmartPrimaryAction,
  type ProjectAbilityCounts,
  type ProjectAbilityId,
} from "@/lib/talent-buyers/project-abilities";
import {
  projectAbilityFirstStepPath,
  projectAbilityPath,
  projectHomePath,
  projectPath,
  projectTabPath,
} from "@/lib/talent-buyers/project-routes";

import { ProjectCoverAvatar } from "../ProjectWorkspaceChrome";
import { useProjectWorkspace, type ComposableWorkspaceMeta } from "../ProjectWorkspaceContext";
import { ProjectWorkspaceTabs } from "../ProjectWorkspaceTabs";
import { AbilityIconRow } from "./AbilityIconRow";
import { ComposableProjectUiContext, type ComposableProjectUi } from "./ComposableProjectUiContext";
import { EditProjectShellModal } from "./EditProjectShellModal";
import { ManageAbilitiesModal } from "./ManageAbilitiesModal";
import { resolvePendingViewTransition } from "./view-transition";

import "../project-workspace.css";
import "./composable-project.css";

type ComposableTab = {
  id: "home" | ProjectAbilityId | "files";
  label: string;
  href: string;
  active: boolean;
  paused?: boolean;
  badge?: number;
};

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

function ComposableProjectTabs({ composable }: { composable: ComposableWorkspaceMeta }) {
  const pathname = usePathname();
  const { projectId, attachments } = useProjectWorkspace();
  const castingRoute = isCastingRoute(pathname, projectId);

  const tabs: ComposableTab[] = [
    {
      id: "home",
      label: "Home",
      href: projectHomePath(projectId),
      active: pathname === projectHomePath(projectId),
    },
    ...composable.abilities.map((ability) => ({
      id: ability.id,
      label: PROJECT_ABILITIES[ability.id].label,
      href: projectAbilityPath(projectId, ability.id),
      active:
        ability.id === "casting"
          ? castingRoute
          : pathname.startsWith(projectPath(projectId, ability.id)),
      paused: ability.status === "paused",
    })),
    {
      id: "files",
      label: "Files",
      href: projectTabPath(projectId, "files"),
      active: pathname.startsWith(projectTabPath(projectId, "files")),
      badge: attachments.length,
    },
  ];

  return (
    <>
      <nav className="composable-tabs" aria-label="Project sections">
        {tabs.map((tab) => {
          const Icon = tab.id === "home" || tab.id === "files" ? null : PROJECT_ABILITIES[tab.id].icon;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={[
                "composable-tabs__tab",
                tab.active ? "composable-tabs__tab--active" : "",
                tab.paused ? "composable-tabs__tab--paused" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={tab.active ? "page" : undefined}
              title={tab.paused ? `${tab.label} · Paused` : undefined}
            >
              {Icon ? <Icon aria-hidden className="composable-tabs__icon" /> : null}
              <span>{tab.label}</span>
              {tab.paused ? <span className="composable-tabs__meta">Paused</span> : null}
              {tab.badge ? <span className="composable-tabs__badge">{tab.badge > 99 ? "99+" : tab.badge}</span> : null}
            </Link>
          );
        })}
      </nav>
      {castingRoute ? (
        <div className="composable-tabs__stages">
          <ProjectWorkspaceTabs />
        </div>
      ) : null}
    </>
  );
}

function ComposableChromeEnd({
  composable,
  castingRoute,
  projectId,
  castingStatus,
  counts,
  onOpenAbilities,
  onEditCasting,
}: {
  composable: ComposableWorkspaceMeta;
  castingRoute: boolean;
  projectId: string;
  castingStatus: CastingProjectStatus | null | undefined;
  counts: ProjectAbilityCounts;
  onOpenAbilities: () => void;
  onEditCasting: () => void;
}) {
  // Rendered in the dashboard chrome, outside ProjectWorkspaceProvider.
  const status = composable.archivedAt ? "archived" : projectShellStatus(composable.endDate);
  const smart = resolveSmartPrimaryAction(composable.abilities, counts);

  return (
    <>
      <span
        className={`buyer-chrome-bar__status-chip ${
          status === "active" ? "buyer-chrome-bar__status-chip--published" : "buyer-chrome-bar__status-chip--draft"
        }`}
        title="Projects are private. Abilities publish on their own."
      >
        {status === "archived" ? "Archived" : status === "ended" ? "Ended" : "Active"} · Private
      </span>
      <AbilityIconRow abilities={composable.abilities} size="md" className="composable-chrome__abilities" />
      {castingRoute ? (
        <>
          <button type="button" className="buyer-chrome-bar__edit-link" onClick={onEditCasting}>
            Casting details
          </button>
          <CastingStatusActionButton projectId={projectId} status={castingStatus} />
        </>
      ) : smart.kind === "ability-step" ? (
        <>
          <button type="button" className="bd-btn-secondary composable-chrome__add" onClick={onOpenAbilities}>
            <Plus aria-hidden /> Ability
          </button>
          <Link href={projectAbilityFirstStepPath(projectId, smart.ability)} className="buyer-chrome-bar__cta">
            {smart.label}
          </Link>
        </>
      ) : (
        <button type="button" className="buyer-chrome-bar__cta composable-chrome__add" onClick={onOpenAbilities}>
          <Plus aria-hidden /> Ability
        </button>
      )}
    </>
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
  const [abilityManager, setAbilityManager] = useState<{ open: boolean; preselect: ProjectAbilityId[] }>({
    open: false,
    preselect: [],
  });
  const [shellEditorOpen, setShellEditorOpen] = useState(false);
  const [castingEditorOpen, setCastingEditorOpen] = useState(false);
  const castingRoute = isCastingRoute(pathname, projectId);
  const counts = useComposableAbilityCounts();
  const castingStatus = castingWorkflow?.primaryCasting?.status;
  const projectTitle = project.title || "Untitled project";
  const subtitle = projectShellSubtitle({
    location: project.location,
    startDate: composable.startDate,
    endDate: composable.endDate,
  });

  useEffect(() => {
    resolvePendingViewTransition();
  }, [pathname]);

  const openAbilityManager = useCallback((preselect: ProjectAbilityId[] = []) => {
    setAbilityManager({ open: true, preselect });
  }, []);
  const openShellEditor = useCallback(() => setShellEditorOpen(true), []);
  const ui = useMemo<ComposableProjectUi>(
    () => ({ openAbilityManager, openShellEditor }),
    [openAbilityManager, openShellEditor],
  );

  const abilitySignature = composable.abilities.map((ability) => `${ability.id}:${ability.status}`).join(",");

  useRegisterBuyerChrome({
    leading: <ProjectCoverAvatar project={project} size="large" />,
    title: projectTitle,
    lede: subtitle || undefined,
    breadcrumbs: [],
    end: (
      <ComposableChromeEnd
        composable={composable}
        castingRoute={castingRoute}
        projectId={projectId}
        castingStatus={castingStatus}
        counts={counts}
        onOpenAbilities={() => openAbilityManager()}
        onEditCasting={() => setCastingEditorOpen(true)}
      />
    ),
    revision: `${projectId}:${projectTitle}:${subtitle}:${abilitySignature}:${castingRoute}:${
      castingStatus ?? ""
    }:${castingWorkflow?.roles.length ?? 0}:${composable.archivedAt ?? ""}:${counts.castingCount}:${
      counts.castingRoleCount
    }:${counts.rosterCount}:${counts.classSessionCount}`,
  });

  return (
    <ComposableProjectUiContext.Provider value={ui}>
      <div className="project-workspace composable-project">
        <section className="project-workspace__panel" aria-label="Project content">
          <div className="project-workspace__sticky-top">
            <ComposableProjectTabs composable={composable} />
          </div>
          {children}
        </section>
        <ManageAbilitiesModal
          open={abilityManager.open}
          onClose={() => setAbilityManager({ open: false, preselect: [] })}
          projectId={projectId}
          abilities={composable.abilities}
          preselect={abilityManager.preselect}
        />
        <EditProjectShellModal
          open={shellEditorOpen}
          onClose={() => setShellEditorOpen(false)}
          project={{
            id: projectId,
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
