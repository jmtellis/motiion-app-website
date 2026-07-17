"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import { BuyerCoverImage } from "@/components/talent-buyers/dashboard/BuyerCoverImage";
import { CastingCoverVisibilityBadge } from "@/components/talent-buyers/casting/CastingCoverVisibilityBadge";
import { getProjectNavigation } from "@/lib/talent-buyers/project-navigation";
import {
  projectTabPath,
  projectWorkspacePath,
  type ProjectTabId,
} from "@/lib/talent-buyers/project-routes";

import { useProjectWorkspace } from "./ProjectWorkspaceContext";

import "../dashboard/buyer-chrome.css";
import "./project-workspace.css";

export type ProjectWorkspaceMeta = {
  id: string;
  title: string;
  coverImageUrl: string | null;
  projectType: string | null;
  location: string | null;
  productionCompany: string | null;
  isDraft: boolean;
  updatedAt: string | null;
};

function RailNavLink({
  href,
  active,
  icon: Icon,
  label,
  count,
  statusLabel,
  disabled,
}: {
  href: string;
  active: boolean;
  icon: LucideIcon;
  label: string;
  count?: number | null;
  statusLabel?: string | null;
  disabled?: boolean;
}) {
  const title = statusLabel ? `${label} · ${statusLabel}` : label;

  if (disabled) {
    return (
      <span
        className="buyer-sidebar__link project-workspace__nav-btn project-workspace__nav-btn--disabled"
        aria-disabled="true"
        title={title}
      >
        <Icon className="buyer-sidebar__link-icon" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {statusLabel ? <span className="project-workspace__nav-status">{statusLabel}</span> : null}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`buyer-sidebar__link project-workspace__nav-btn ${active ? "buyer-sidebar__link--active" : ""}`}
      aria-current={active ? "page" : undefined}
      title={title}
    >
      <Icon className="buyer-sidebar__link-icon" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {statusLabel ? <span className="project-workspace__nav-status">{statusLabel}</span> : null}
      {count != null && count > 0 ? (
        <span className="project-workspace__nav-count">{count}</span>
      ) : null}
    </Link>
  );
}

function resolveActive(
  pathname: string,
  projectId: string,
): { section: "project" | "workspace"; id: string } {
  const base = `/projects/${projectId}`;
  if (pathname.startsWith(`${base}/workspace/`)) {
    const tab = pathname.slice(`${base}/workspace/`.length).split("/")[0] ?? "";
    return { section: "workspace", id: tab };
  }

  const segment = pathname.slice(base.length + 1).split("/")[0] ?? "overview";
  if (segment === "activities" || segment === "timeline" || segment === "talent") {
    return { section: "project", id: "overview" };
  }
  return { section: "project", id: segment || "overview" };
}

export function ProjectWorkspaceLeftRail({
  project,
  fileCount,
}: {
  project: ProjectWorkspaceMeta;
  fileCount: number;
}) {
  const pathname = usePathname();
  const { castingWorkflow } = useProjectWorkspace();
  const navigation = getProjectNavigation({ projectType: project.projectType });
  const active = resolveActive(pathname, project.id);
  const isCastingProject = project.projectType === "casting";
  const castingVisibility = castingWorkflow?.primaryCasting?.visibility;
  const castingLifecycleStatus = castingWorkflow?.primaryCasting?.status;
  const castStatusLabel =
    castingLifecycleStatus === "closed"
      ? "Closed"
      : castingLifecycleStatus === "published" || castingLifecycleStatus === "paused"
        ? "Open"
        : null;

  const projectCounts: Partial<Record<ProjectTabId, number | null>> = {
    files: fileCount,
  };

  return (
    <aside className="project-workspace__rail" aria-label="Project workspace navigation">
      <div className="project-workspace__cover">
        <BuyerCoverImage
          src={project.coverImageUrl ?? ""}
          alt=""
          fill
          overlay
          fallbackId={project.id}
          fallbackCategory="project"
        />
        <div
          className={`project-workspace__cover-footer${isCastingProject ? " project-workspace__cover-footer--casting" : ""}`}
        >
          <p className="project-workspace__cover-title">{project.title || "Untitled project"}</p>
          {isCastingProject ? <CastingCoverVisibilityBadge visibility={castingVisibility} /> : null}
        </div>
      </div>

      <div className="project-workspace__rail-main buyer-dashboard-shell__sidebar-scroll">
        <nav className="buyer-sidebar__section project-workspace__nav-section" aria-label="Project">
          <p className="buyer-sidebar__section-label">Project</p>
          <div className="buyer-sidebar__section-links">
            {navigation.project.map((tab) => (
              <RailNavLink
                key={tab.id}
                href={projectTabPath(project.id, tab.id as ProjectTabId)}
                active={active.section === "project" && active.id === tab.id}
                icon={tab.icon}
                label={tab.label}
                count={projectCounts[tab.id as ProjectTabId]}
                disabled={tab.disabled}
              />
            ))}
          </div>
        </nav>

        {navigation.workspace.length > 0 ? (
          <nav
            className="buyer-sidebar__section project-workspace__nav-section project-workspace__nav-section--workspace"
            aria-label="Workspace"
          >
            <p className="buyer-sidebar__section-label">Workspace</p>
            <div className="buyer-sidebar__section-links">
              {navigation.workspace.map((tab) => (
                <RailNavLink
                  key={tab.id}
                  href={projectWorkspacePath(project.id, tab.path)}
                  active={active.section === "workspace" && active.id === tab.id}
                  icon={tab.icon}
                  label={tab.label}
                  count={tab.badge}
                  statusLabel={tab.id === "cast" ? castStatusLabel : null}
                  disabled={tab.disabled}
                />
              ))}
            </div>
          </nav>
        ) : null}
      </div>

      <div className="project-workspace__rail-footer">
        <Link href={`/projects/${project.id}/edit`} className="project-workspace__edit-btn">
          Edit project
        </Link>
      </div>
    </aside>
  );
}
