"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { BuyerInboxFile } from "@/types/buyer-file-inbox";
import type { ProjectHubSummary } from "@/lib/talent-buyers/projects-hub";

import { ProjectTypePickerOverlay } from "@/components/talent-buyers/project/ProjectTypePickerOverlay";
import { PROJECTS_CREATE_QUERY } from "@/lib/talent-buyers/projects-hub-constants";

import { FadeInSection } from "./FadeInSection";
import { ProjectCarousel } from "./ProjectCarousel";
import { ProjectGridView } from "./ProjectGridView";
import { ProjectsEmptyState } from "./ProjectsEmptyState";
import { ProjectsHubFilesSection } from "./ProjectsHubFilesSection";
import { ProjectsHubViewToggle, useProjectsViewMode } from "./ProjectsViewModeContext";
import { UnderlineTabs } from "./UnderlineTabs";

import "./projects-hub.css";

type ProjectScopeFilter = "all" | "active" | "archived";

const PROJECT_SCOPE_OPTIONS: { value: ProjectScopeFilter; label: string }[] = [
  { value: "all", label: "All Projects" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

function sortByLastUpdated(projects: ProjectHubSummary[]) {
  return [...projects].sort(
    (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime(),
  );
}

function filterByScope(projects: ProjectHubSummary[], scope: ProjectScopeFilter) {
  if (scope === "active") {
    return projects.filter((project) => project.status === "active");
  }
  if (scope === "archived") {
    return projects.filter((project) => project.status === "archived");
  }
  return projects;
}

export function ProjectsHubView({
  published,
  drafts,
  inboxFiles,
}: {
  published: ProjectHubSummary[];
  drafts: ProjectHubSummary[];
  inboxFiles: BuyerInboxFile[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { viewMode } = useProjectsViewMode();
  const [createPickerOpen, setCreatePickerOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const [scopeFilter, setScopeFilter] = useState<ProjectScopeFilter>("all");

  const allProjects = useMemo(
    () => sortByLastUpdated([...published, ...drafts]),
    [published, drafts],
  );
  const browseProjects = useMemo(
    () => filterByScope(allProjects, scopeFilter),
    [allProjects, scopeFilter],
  );
  // Focus carousel includes drafts (All) plus active/archived by scope — same pool as Browse.
  const focusProjects = useMemo(
    () => filterByScope(allProjects, scopeFilter),
    [allProjects, scopeFilter],
  );
  const isEmpty = allProjects.length === 0;
  const hasVisibleProjects =
    viewMode === "browse" ? browseProjects.length > 0 : focusProjects.length > 0;
  const focusItem = focusProjects[focusIndex] ?? focusProjects[0] ?? null;
  // File inbox attaches to project rows only — skip activity cards.
  const focusProjectId =
    focusItem && focusItem.workKind !== "activity" && focusItem.workKind !== "job"
      ? focusItem.id
      : null;

  const openCreatePicker = useCallback(() => {
    setCreatePickerOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set(PROJECTS_CREATE_QUERY, "1");
    router.replace(`/projects?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const closeCreatePicker = useCallback(() => {
    setCreatePickerOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete(PROJECTS_CREATE_QUERY);
    const query = params.toString();
    router.replace(query ? `/projects?${query}` : "/projects", { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    const wantsCreate = searchParams.get(PROJECTS_CREATE_QUERY) === "1";
    setCreatePickerOpen(wantsCreate);
  }, [searchParams]);

  useEffect(() => {
    if (focusIndex >= focusProjects.length) {
      setFocusIndex(0);
    }
  }, [focusIndex, focusProjects.length]);

  return (
    <div className={`projects-hub${isEmpty ? " projects-hub--empty" : ""}`}>
      <div className="projects-hub__sticky-header">
        <div className="projects-hub__mode-row">
          <ProjectsHubViewToggle />
        </div>
      </div>

      <div className="projects-hub__title-row">
        <h1 className="sr-only">Projects</h1>
        <UnderlineTabs
          ariaLabel="Project scope"
          value={scopeFilter}
          onChange={setScopeFilter}
          options={PROJECT_SCOPE_OPTIONS}
        />
        <button
          type="button"
          className="buyer-chrome-bar__cta projects-hub__new-project"
          onClick={openCreatePicker}
        >
          Create
        </button>
      </div>

      {isEmpty || !hasVisibleProjects ? (
        <ProjectsEmptyState onCreateProject={openCreatePicker} viewMode={viewMode} />
      ) : viewMode === "browse" ? (
        <FadeInSection>
          <ProjectGridView projects={browseProjects} />
        </FadeInSection>
      ) : (
        <ProjectCarousel projects={focusProjects} onActiveIndexChange={setFocusIndex} />
      )}

      <ProjectsHubFilesSection
        viewMode={viewMode}
        inboxFiles={inboxFiles}
        projects={allProjects}
        focusProjectId={viewMode === "focus" ? focusProjectId : null}
        skeletonOnly={isEmpty && viewMode === "focus"}
      />

      <ProjectTypePickerOverlay open={createPickerOpen} onClose={closeCreatePicker} />
    </div>
  );
}
