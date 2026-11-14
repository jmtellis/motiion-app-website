"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import { IndustryEmptyState } from "./IndustryUI";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { ExploreSearchField } from "@/components/ui/ExploreSearchField";
import type { ProjectHubSummary } from "@/lib/talent-buyers/projects-hub";
import { NewProjectSheet } from "@/components/talent-buyers/project/composable/NewProjectSheet";
import { filterProjects, projectHubQuery, projectScope, type ProjectScope } from "@/lib/talent-buyers/projects-hub-filters";
import { PROJECTS_CREATE_ACTIVITY_VALUE, PROJECTS_CREATE_INTENT_QUERY, PROJECTS_CREATE_QUERY } from "@/lib/talent-buyers/projects-hub-constants";
import { ProjectGridView } from "./ProjectGridView";
import { SegmentedControl } from "./SegmentedControl";
import "./projects-hub.css";

const PROJECT_SCOPE_OPTIONS: { value: ProjectScope; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

export function ProjectsHubView({ userId, published, drafts }: {
  userId: string;
  published: ProjectHubSummary[];
  drafts: ProjectHubSummary[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const main = rootRef.current?.closest("main");
    if (!main) return;
    const update = () => setScrolled(main.scrollTop > 8);
    update();
    main.addEventListener("scroll", update, { passive: true });
    return () => main.removeEventListener("scroll", update);
  }, []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [workType, setWorkType] = useState("all");
  const [query, setQuery] = useState("");
  const scope = projectScope(searchParams.get("scope"));
  const createQuery = searchParams.get(PROJECTS_CREATE_QUERY);
  const createSheetOpen = createQuery === "1" || createQuery === PROJECTS_CREATE_ACTIVITY_VALUE;
  const createIntent = searchParams.get(PROJECTS_CREATE_INTENT_QUERY) === "casting" ? "casting" : null;
  const allProjects = useMemo(() => [...published, ...drafts], [published, drafts]);
  const visibleProjects = useMemo(() => filterProjects(allProjects, { scope, type: workType, query: scope === "archived" ? query : "" }), [allProjects, scope, workType, query]);

  useEffect(() => {
    // Storage is optional (private browsing and blocked storage must still work).
    try { localStorage.removeItem("projects-view-mode"); } catch { /* no persisted mode is needed */ }
    const normalized = projectHubQuery(new URLSearchParams(searchParams.toString()), scope);
    if (normalized !== searchParams.toString()) router.replace(normalized ? `/projects?${normalized}` : "/projects", { scroll: false });
  }, [router, scope, searchParams]);

  const updateScope = useCallback((value: ProjectScope) => {
    const next = projectHubQuery(new URLSearchParams(searchParams.toString()), value);
    router.push(next ? `/projects?${next}` : "/projects", { scroll: false });
  }, [router, searchParams]);
  const setCreateOpen = useCallback((open: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (open) params.set(PROJECTS_CREATE_QUERY, "1");
    else { params.delete(PROJECTS_CREATE_QUERY); params.delete(PROJECTS_CREATE_INTENT_QUERY); }
    router.replace(params.size ? `/projects?${params}` : "/projects", { scroll: false });
  }, [router, searchParams]);
  const filtered = Boolean((scope === "archived" && query.trim()) || workType !== "all");
  const isEmpty = allProjects.length === 0;

  return <div ref={rootRef} className={`projects-hub${isEmpty ? " projects-hub--empty" : ""}`}>
    <div className="projects-hub__pinned-header" data-scrolled={scrolled}>
      <div className="projects-hub__center-tabs"><SegmentedControl ariaLabel="Project status" value={scope} onChange={updateScope} options={PROJECT_SCOPE_OPTIONS} /></div>
    </div>
    <div className="projects-hub__overview">
      <div><h1>Projects</h1><p className="projects-hub__result-count" role="status">{visibleProjects.length} {visibleProjects.length === 1 ? "project" : "projects"}</p></div>
      <div className="industry-work-tools">
        {scope === "archived" ? <ExploreSearchField aria-label="Search projects" placeholder="Search projects…" value={query} onChange={(event) => setQuery(event.target.value)}>
          {query && <button className="projects-hub__clear-search" type="button" aria-label="Clear search" onClick={() => setQuery("")}><X size={16} aria-hidden /></button>}
        </ExploreSearchField> : null}
        <div className="projects-hub__type-actions">
        <FilterSelect label="Project type" value={workType} onChange={setWorkType} options={["all", "casting", "event", "class", "session", "job"].map((type) => ({ value: type, label: type === "all" ? "All types" : type[0].toUpperCase() + type.slice(1) }))} />
          <button type="button" className="ui-chip projects-hub__create" onClick={() => setCreateOpen(true)}><Plus size={14} aria-hidden />New project</button>
        </div>
      </div>
    </div>
    {visibleProjects.length ? <>
      <ProjectGridView projects={visibleProjects} archived={scope === "archived"} />
    </> : <IndustryEmptyState
      illustration={filtered ? "search" : "projects"}
      title={isEmpty ? "Your next project starts here" : filtered ? "No projects match your filters" : scope === "archived" ? "No archived projects" : "No active projects yet"}
      description={isEmpty ? "Create a project, then add casting, a roster, or classes as you need them." : filtered ? "Try another name or project type." : scope === "archived" ? "Archived work stays available here so you can return to it." : "Start a project or return to a draft to bring your next idea to life."}
      actions={filtered ? <button className="bd-btn-secondary" onClick={() => { setQuery(""); setWorkType("all"); }}>Clear filters</button> : <button className="buyer-chrome-bar__cta" onClick={() => setCreateOpen(true)}><Plus size={16} aria-hidden /> Create a project</button>} />}
    <NewProjectSheet userId={userId} open={createSheetOpen} onClose={() => setCreateOpen(false)} intent={createIntent} />
  </div>;
}
