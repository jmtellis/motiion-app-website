"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";

import { getProjectNavigation } from "@/lib/talent-buyers/project-navigation";
import type { ProjectNavItem } from "@/lib/talent-buyers/project-workspace-config";
import {
  projectTabPath,
  projectWorkspacePath,
  resolveProjectNavActive,
  type ProjectTabId,
} from "@/lib/talent-buyers/project-routes";

import { useProjectWorkspace } from "./ProjectWorkspaceContext";

function formatBadge(count: number) {
  if (count <= 0) return null;
  if (count > 99) return "99+";
  if (count > 9) return "9+";
  return String(count);
}

function projectNavItemHref(projectId: string, tab: ProjectNavItem) {
  if (tab.id === "overview" || tab.id === "files" || tab.path === "overview" || tab.path === "files") {
    return projectTabPath(projectId, tab.id as ProjectTabId);
  }
  return projectWorkspacePath(projectId, tab.path);
}

export function ProjectWorkspaceTabs() {
  const pathname = usePathname();
  const { projectId, project, attachments, castingWorkflow } = useProjectWorkspace();
  const groupId = useId();
  const reducedMotion = useReducedMotion();

  const navigation = getProjectNavigation({ projectType: project.projectType });
  const active = resolveProjectNavActive(pathname, projectId, navigation);
  const items = navigation.sections.flatMap((section) => section.items);
  const fileBadge = attachments.length > 0 ? formatBadge(attachments.length) : null;
  const castingLifecycleStatus = castingWorkflow?.primaryCasting?.status;
  const castStatusLabel =
    castingLifecycleStatus === "closed"
      ? "Closed"
      : castingLifecycleStatus === "published" || castingLifecycleStatus === "paused"
        ? "Open"
        : null;

  if (items.length === 0) return null;

  return (
    <nav className="project-workspace-tabs">
      <div className="project-workspace-tabs__scroller" role="tablist" aria-label="Project sections">
        {items.map((tab) => {
          const isActive = active.id === tab.id;
          const href = projectNavItemHref(projectId, tab);
          const badge =
            tab.id === "files"
              ? fileBadge
              : tab.badge != null && tab.badge > 0
                ? formatBadge(tab.badge)
                : null;
          const statusLabel = tab.id === "cast" ? castStatusLabel : null;
          const title = statusLabel ? `${tab.label} · ${statusLabel}` : tab.label;

          const className = [
            "project-workspace-tabs__tab",
            isActive ? "project-workspace-tabs__tab--active" : "",
            tab.disabled ? "project-workspace-tabs__tab--disabled" : "",
          ]
            .filter(Boolean)
            .join(" ");

          const content = (
            <>
              <span className="project-workspace-tabs__label">{tab.label}</span>
              {statusLabel ? (
                <span className="project-workspace-tabs__status">{statusLabel}</span>
              ) : null}
              {badge ? <span className="project-workspace-tabs__badge">{badge}</span> : null}
              {isActive ? (
                reducedMotion ? (
                  <span className="project-workspace-tabs__underline" aria-hidden />
                ) : (
                  <motion.span
                    layoutId={`${groupId}-project-tab-underline`}
                    className="project-workspace-tabs__underline"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    aria-hidden
                  />
                )
              ) : null}
            </>
          );

          if (tab.disabled) {
            return (
              <span
                key={tab.id}
                className={className}
                role="tab"
                aria-selected={false}
                aria-disabled="true"
                title={title}
              >
                {content}
              </span>
            );
          }

          return (
            <Link
              key={tab.id}
              href={href}
              className={className}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              title={statusLabel ? title : undefined}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
