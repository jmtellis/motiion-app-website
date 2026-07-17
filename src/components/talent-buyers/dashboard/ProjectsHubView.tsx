"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { ProjectHubSummary } from "@/lib/talent-buyers/projects-hub";

import { useRegisterBuyerChrome } from "./BuyerPageChromeContext";
import { FadeInSection } from "./FadeInSection";
import { ProjectCard } from "./ProjectCard";
import { ProjectCarousel } from "./ProjectCarousel";
import { ProjectGridView } from "./ProjectGridView";
import { ProjectsHubViewToggle, useProjectsViewMode } from "./ProjectsViewModeContext";
import { StaggerList } from "./FadeInSection";
import { PROJECTS_CREATE_QUERY } from "@/lib/talent-buyers/projects-hub-constants";
import { ProjectTypePickerOverlay } from "@/components/talent-buyers/project/ProjectTypePickerOverlay";

import "./projects-hub.css";

function sortByLastUpdated(projects: ProjectHubSummary[]) {
  return [...projects].sort(
    (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime(),
  );
}

export function ProjectsHubView({
  published,
  drafts,
}: {
  published: ProjectHubSummary[];
  drafts: ProjectHubSummary[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { viewMode } = useProjectsViewMode();
  const [createPickerOpen, setCreatePickerOpen] = useState(false);

  const allProjects = useMemo(
    () => sortByLastUpdated([...published, ...drafts]),
    [published, drafts],
  );

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
    setCreatePickerOpen(searchParams.get(PROJECTS_CREATE_QUERY) === "1");
  }, [searchParams]);

  useRegisterBuyerChrome({
    breadcrumbs: [{ label: "Projects" }],
    revision: viewMode,
  });

  return (
    <div className="projects-hub">
      <div className="projects-hub__toolbar">
        <div className="projects-hub__view-toggle">
          <ProjectsHubViewToggle />
        </div>
        <button
          type="button"
          className="buyer-chrome-bar__cta projects-hub__new-project"
          onClick={openCreatePicker}
        >
          New project
        </button>
      </div>

      {viewMode === "grid" ? (
        <FadeInSection>
          <ProjectGridView projects={allProjects} onCreateProject={openCreatePicker} />
        </FadeInSection>
      ) : (
        <>
          <ProjectCarousel projects={published} showCreateSlide />

          {drafts.length ? (
            <FadeInSection delay={0.05}>
              <section className="projects-hub__drafts space-y-4">
                <h2 className="bd-eyebrow">Draft projects</h2>
                <StaggerList className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" stagger={0.04}>
                  {sortByLastUpdated(drafts).map((project) => (
                    <ProjectCard key={project.id} project={project} variant="dashboard" />
                  ))}
                </StaggerList>
              </section>
            </FadeInSection>
          ) : null}
        </>
      )}

      <ProjectTypePickerOverlay open={createPickerOpen} onClose={closeCreatePicker} />
    </div>
  );
}
