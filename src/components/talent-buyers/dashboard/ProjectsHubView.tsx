"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, X } from "lucide-react";
import { IndustryPageHeader, IndustryEmptyState } from "./IndustryUI";
import type { BuyerInboxFile } from "@/types/buyer-file-inbox";
import type { ProjectHubSummary } from "@/lib/talent-buyers/projects-hub";
import { NewProjectSheet } from "@/components/talent-buyers/project/composable/NewProjectSheet";
import { formatNextBeat, pickNextBeat, type ScheduleMarker } from "@/lib/talent-buyers/schedule-markers";
import { filterProjects, projectHubQuery, projectScope, type ProjectScope } from "@/lib/talent-buyers/projects-hub-filters";
import { formatTimeShort, parseDateKey, toDateKey } from "./calendar/calendar-utils";
import { PROJECTS_CREATE_ACTIVITY_VALUE, PROJECTS_CREATE_INTENT_QUERY, PROJECTS_CREATE_QUERY } from "@/lib/talent-buyers/projects-hub-constants";
import { ProjectGridView } from "./ProjectGridView";
import { ProjectsHubFilesSection } from "./ProjectsHubFilesSection";
import { UnderlineTabs } from "./UnderlineTabs";
import "./projects-hub.css";

const PROJECT_SCOPE_OPTIONS: { value: ProjectScope; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Drafts" },
  { value: "archived", label: "Archived" },
];
const subscribeNever = () => () => {};

export function ProjectsHubView({ userId, published, drafts, inboxFiles, inboxError, nextBeats = {} }: {
  userId: string;
  published: ProjectHubSummary[];
  drafts: ProjectHubSummary[];
  inboxFiles: BuyerInboxFile[];
  inboxError?: string;
  nextBeats?: Record<string, ScheduleMarker[]>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [workType, setWorkType] = useState("all");
  const [query, setQuery] = useState("");
  const scope = projectScope(searchParams.get("scope"));
  const createQuery = searchParams.get(PROJECTS_CREATE_QUERY);
  const createSheetOpen = createQuery === "1" || createQuery === PROJECTS_CREATE_ACTIVITY_VALUE;
  const createIntent = searchParams.get(PROJECTS_CREATE_INTENT_QUERY) === "casting" ? "casting" : null;
  const allProjects = useMemo(() => [...published, ...drafts], [published, drafts]);
  const visibleProjects = useMemo(() => filterProjects(allProjects, { scope, type: workType, query }), [allProjects, scope, workType, query]);
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const nextBeatLabels = useMemo(() => {
    if (!hydrated) return {};
    const today = toDateKey(new Date());
    return Object.fromEntries(Object.entries(nextBeats).flatMap(([id, beats]) => {
      const next = pickNextBeat(beats, today);
      return next ? [[id, formatNextBeat(next, (date) => parseDateKey(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }), formatTimeShort)]] : [];
    }));
  }, [hydrated, nextBeats]);

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
  const filtered = Boolean(query.trim() || workType !== "all");
  const isEmpty = allProjects.length === 0;

  return <div className={`projects-hub${isEmpty ? " projects-hub--empty" : ""}`}>
    <IndustryPageHeader eyebrow="Your workspace" title="Projects"
      description="Cast your team, organize schedules, and keep the next step in view."
      actions={<button className="buyer-chrome-bar__cta" onClick={() => setCreateOpen(true)}><Plus size={16} aria-hidden /> New project</button>} />
    {!isEmpty && <div className="industry-work-toolbar projects-hub__toolbar">
      <UnderlineTabs ariaLabel="Project status" value={scope} onChange={updateScope} options={PROJECT_SCOPE_OPTIONS} />
      <div className="industry-work-tools">
        <select className="studio-type-filter" aria-label="Project type" value={workType} onChange={(event) => setWorkType(event.target.value)}>
          {["all", "casting", "event", "class", "session", "job"].map((type) => <option key={type} value={type}>{type === "all" ? "All types" : type[0].toUpperCase() + type.slice(1)}</option>)}
        </select>
        <label className="industry-search"><Search size={16} aria-hidden />
          <input aria-label="Search projects" placeholder="Search projects…" value={query} onChange={(event) => setQuery(event.target.value)} />
          {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><X size={16} aria-hidden /></button>}
        </label>
      </div>
    </div>}
    {visibleProjects.length ? <>
      <p className="projects-hub__result-count" role="status">{visibleProjects.length} {visibleProjects.length === 1 ? "project" : "projects"}</p>
      <ProjectGridView projects={visibleProjects} nextBeatLabels={nextBeatLabels} />
    </> : <IndustryEmptyState
      illustration={filtered ? "search" : "projects"}
      title={isEmpty ? "Your next project starts here" : filtered ? "No projects match your filters" : scope === "draft" ? "No drafts to finish" : scope === "archived" ? "No archived projects" : "No active projects yet"}
      description={isEmpty ? "Create a project, then add casting, a roster, or classes as you need them." : filtered ? "Try another name or project type." : scope === "draft" ? "Unpublished work stays here until you are ready to share it." : scope === "archived" ? "Archived work stays available here so you can return to it." : "Start a project or return to a draft to bring your next idea to life."}
      actions={filtered ? <button className="bd-btn-secondary" onClick={() => { setQuery(""); setWorkType("all"); }}>Clear filters</button> : <button className="buyer-chrome-bar__cta" onClick={() => setCreateOpen(true)}><Plus size={16} aria-hidden /> Create a project</button>} />}
    <ProjectsHubFilesSection inboxFiles={inboxFiles} projects={allProjects} loadError={inboxError} />
    <NewProjectSheet userId={userId} open={createSheetOpen} onClose={() => setCreateOpen(false)} intent={createIntent} />
  </div>;
}
