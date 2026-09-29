"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ArrowUpRight, Plus } from "lucide-react";
import {
  IndustryPageHeader,
  IndustryEmptyState,
  IndustryBadge,
} from "./IndustryUI";
import { Modal } from "./Modal";
import {
  formatBuyerRelativeDate,
  labelFromSnake,
} from "@/lib/talent-buyers/dashboard-data";
import { useRouter, useSearchParams } from "next/navigation";

import type { BuyerInboxFile } from "@/types/buyer-file-inbox";
import type { ProjectHubSummary } from "@/lib/talent-buyers/projects-hub";

import { AbilityIconRow } from "@/components/talent-buyers/project/composable/AbilityIconRow";
import { NewProjectSheet } from "@/components/talent-buyers/project/composable/NewProjectSheet";
import {
  projectShellStatus,
  projectShellSubtitle,
} from "@/lib/talent-buyers/project-abilities";
import {
  formatNextBeat,
  pickNextBeat,
  type ScheduleMarker,
} from "@/lib/talent-buyers/schedule-markers";
import {
  formatTimeShort,
  parseDateKey,
  toDateKey,
} from "./calendar/calendar-utils";
import {
  PROJECTS_CREATE_ACTIVITY_VALUE,
  PROJECTS_CREATE_INTENT_QUERY,
  PROJECTS_CREATE_QUERY,
} from "@/lib/talent-buyers/projects-hub-constants";

import { FadeInSection } from "./FadeInSection";
import { ProjectCarousel } from "./ProjectCarousel";
import { ProjectGridView } from "./ProjectGridView";
import { ProjectsHubFilesSection } from "./ProjectsHubFilesSection";
import {
  ProjectsHubViewToggle,
  useProjectsViewMode,
} from "./ProjectsViewModeContext";
import { UnderlineTabs } from "./UnderlineTabs";

import "./projects-hub.css";

type ProjectScopeFilter = "all" | "active" | "draft" | "archived";

const PROJECT_SCOPE_OPTIONS: { value: ProjectScopeFilter; label: string }[] = [
  { value: "all", label: "All work" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Drafts" },
  { value: "archived", label: "Archived" },
];

function formatBeatDate(date: string) {
  return parseDateKey(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function sortByLastUpdated(projects: ProjectHubSummary[]) {
  return [...projects].sort(
    (a, b) =>
      new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime(),
  );
}

function filterByScope(
  projects: ProjectHubSummary[],
  scope: ProjectScopeFilter,
) {
  if (scope === "draft")
    return projects.filter((project) => project.status === "draft");
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
  nextBeats = {},
}: {
  published: ProjectHubSummary[];
  drafts: ProjectHubSummary[];
  inboxFiles: BuyerInboxFile[];
  /** Upcoming schedule beats per Home row id; the row shows the first one still ahead. */
  nextBeats?: Record<string, ScheduleMarker[]>;
}) {
  const [workType, setWorkType] = useState("all");
  const [query, setQuery] = useState("");
  const [layout, setLayout] = useState<"list" | "grid">("list");
  const [selected, setSelected] = useState<ProjectHubSummary | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { viewMode } = useProjectsViewMode();
  const createQuery = searchParams.get(PROJECTS_CREATE_QUERY);
  // `?create=activity` used to open a standalone picker; creation now always starts with a project.
  const createSheetOpen =
    createQuery === "1" || createQuery === PROJECTS_CREATE_ACTIVITY_VALUE;
  const createIntent =
    searchParams.get(PROJECTS_CREATE_INTENT_QUERY) === "casting" ? "casting" : null;
  const [focusIndex, setFocusIndex] = useState(0);
  const [scopeFilter, setScopeFilter] = useState<ProjectScopeFilter>("all");

  const allProjects = useMemo(
    () => sortByLastUpdated([...published, ...drafts]),
    [published, drafts],
  );
  const browseProjects = useMemo(
    () =>
      filterByScope(allProjects, scopeFilter)
        .filter(
          (project) =>
            workType === "all" ||
            (workType === "casting"
              ? project.projectType === "casting" &&
                project.workKind !== "activity"
              : project.workTypeLabel?.toLowerCase() === workType),
        )
        .filter((project) =>
          `${project.title} ${project.workTypeLabel ?? project.projectType}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        ),
    [allProjects, scopeFilter, query, workType],
  );
  // Focus carousel includes drafts (All) plus active/archived by scope — same pool as Browse.
  const focusProjects = useMemo(
    () =>
      filterByScope(allProjects, scopeFilter)
        .filter(
          (project) =>
            workType === "all" ||
            (workType === "casting"
              ? project.projectType === "casting" &&
                project.workKind !== "activity"
              : project.workTypeLabel?.toLowerCase() === workType),
        )
        .filter((project) =>
          `${project.title} ${project.workTypeLabel ?? project.projectType}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        ),
    [allProjects, scopeFilter, query, workType],
  );
  const isEmpty = allProjects.length === 0;
  const nextBeatLabels = useMemo(() => {
    const today = toDateKey(new Date());
    const labels: Record<string, string> = {};
    for (const [workId, beats] of Object.entries(nextBeats)) {
      const next = pickNextBeat(beats, today);
      if (next) labels[workId] = formatNextBeat(next, formatBeatDate, formatTimeShort);
    }
    return labels;
  }, [nextBeats]);
  const hasVisibleProjects =
    viewMode === "browse"
      ? browseProjects.length > 0
      : focusProjects.length > 0;
  const focusItem = focusProjects[focusIndex] ?? focusProjects[0] ?? null;
  // File inbox attaches to project rows only — skip activity cards.
  const focusProjectId =
    focusItem &&
    focusItem.workKind !== "activity" &&
    focusItem.workKind !== "job"
      ? focusItem.id
      : null;

  const openCreatePicker = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(PROJECTS_CREATE_QUERY, "1");
    router.replace(`/projects?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const closeCreatePicker = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(PROJECTS_CREATE_QUERY);
    params.delete(PROJECTS_CREATE_INTENT_QUERY);
    const query = params.toString();
    router.replace(query ? `/projects?${query}` : "/projects", {
      scroll: false,
    });
  }, [router, searchParams]);

  const header = (
    <IndustryPageHeader
      eyebrow="Your workspace"
      title="Projects"
      description="Cast your team, bring people together, and keep every detail in one place."
      actions={
        isEmpty ? null : (
          <button className="buyer-chrome-bar__cta" onClick={openCreatePicker}>
            <Plus size={16} /> New project
          </button>
        )
      }
    />
  );
  const createSheet = (
    <NewProjectSheet
      open={createSheetOpen}
      onClose={closeCreatePicker}
      intent={createIntent}
    />
  );

  if (isEmpty) {
    return (
      <div className="projects-hub projects-hub--empty">
        {header}
        <IndustryEmptyState
          title="Every great production starts here"
          description="Projects hold your castings, rosters, and classes in one place."
          actions={
            <button
              className="buyer-chrome-bar__cta"
              onClick={openCreatePicker}
            >
              Create a project
            </button>
          }
        />
        {createSheet}
      </div>
    );
  }

  return (
    <div className="projects-hub">
      {header}
      <div className="industry-section-heading">
        <h2>Your work</h2>
        <ProjectsHubViewToggle />
      </div>
      <div className="industry-work-toolbar">
        <UnderlineTabs
          ariaLabel="Project scope"
          value={scopeFilter}
          onChange={setScopeFilter}
          options={PROJECT_SCOPE_OPTIONS}
        />
        <div className="industry-work-tools">
          <select
            className="studio-type-filter"
            aria-label="Work type"
            value={workType}
            onChange={(event) => setWorkType(event.target.value)}
          >
            {["all", "casting", "event", "class", "session", "job"].map(
              (type) => (
                <option key={type} value={type}>
                  {type === "all"
                    ? "All types"
                    : type[0].toUpperCase() + type.slice(1)}
                </option>
              ),
            )}
          </select>
          <label className="industry-search">
            <Search size={16} aria-hidden />
            <input
              aria-label="Search your work"
              placeholder="Search your work…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery("")}>
                ×
              </button>
            )}
          </label>
          {viewMode === "browse" && (
            <div className="industry-layout-switch" aria-label="Work layout">
              <button
                aria-pressed={layout === "list"}
                onClick={() => setLayout("list")}
              >
                List
              </button>
              <button
                aria-pressed={layout === "grid"}
                onClick={() => setLayout("grid")}
              >
                Cards
              </button>
            </div>
          )}
        </div>
      </div>

      {!hasVisibleProjects ? (
        <IndustryEmptyState
          title="No work matches this view"
          description="Try another search or show all of your work."
          actions={
            <button
              className="bd-btn-secondary"
              onClick={() => {
                setQuery("");
                setWorkType("all");
                setScopeFilter("all");
              }}
            >
              Clear filters
            </button>
          }
        />
      ) : viewMode === "browse" ? (
        <FadeInSection>
          {layout === "grid" ? (
            <ProjectGridView projects={browseProjects} nextBeatLabels={nextBeatLabels} />
          ) : (
            <div className="industry-work-list">
              <div className="industry-work-list__labels" aria-hidden>
                <span>Project</span>
                <span>Status</span>
                <span>People</span>
                <span />
              </div>
              {browseProjects.map((project) => (
                <div className="industry-work-row" key={project.id}>
                  <Link
                    className="industry-work-row__name"
                    href={project.href ?? `/projects/${project.id}`}
                  >
                    <span className="studio-work-thumbnail" aria-hidden>
                      {project.coverImageUrl ? (
                        <Image
                          src={project.coverImageUrl}
                          alt=""
                          fill
                          sizes="44px"
                        />
                      ) : (
                        <span>{project.title.slice(0, 1)}</span>
                      )}
                    </span>
                    <span className="industry-work-row__copy">
                      <strong>{project.title}</strong>
                      <small>
                        {project.composable
                          ? projectShellSubtitle(project) || "Project"
                          : (project.workTypeLabel ??
                            labelFromSnake(project.projectType))}
                      </small>
                      {nextBeatLabels[project.id] ? (
                        <small className="industry-work-row__beat">
                          Next: {nextBeatLabels[project.id]}
                        </small>
                      ) : null}
                    </span>
                    <AbilityIconRow
                      abilities={project.abilities}
                      className="industry-work-row__abilities"
                    />
                  </Link>
                  <IndustryBadge
                    tone={project.status === "active" ? "success" : "neutral"}
                  >
                    {project.composable &&
                    project.status === "active" &&
                    projectShellStatus(project.endDate) === "ended"
                      ? "Ended"
                      : labelFromSnake(project.status)}
                  </IndustryBadge>
                  <span className="industry-work-row__date studio-work-people">
                    <span className="studio-avatars">
                      {project.rosterPreview.slice(0, 3).map((person) => (
                        <span key={person.id}>
                          {person.headshotUrl ? (
                            <Image
                              src={person.headshotUrl}
                              alt={person.displayName}
                              fill
                              sizes="24px"
                            />
                          ) : (
                            person.displayName.slice(0, 1)
                          )}
                        </span>
                      ))}
                    </span>
                    {project.talentCount || project.rosterCount ? (
                      <small>
                        {project.talentCount || project.rosterCount}
                      </small>
                    ) : (
                      <small>—</small>
                    )}
                  </span>
                  <button
                    className="industry-icon-action"
                    aria-label={`Preview ${project.title}`}
                    onClick={() => setSelected(project)}
                  >
                    <ArrowUpRight size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </FadeInSection>
      ) : (
        <ProjectCarousel
          projects={focusProjects}
          onActiveIndexChange={setFocusIndex}
        />
      )}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title ?? "Project details"}
        description={selected?.workTypeLabel ?? "Project overview"}
        placement="drawer"
        footer={
          selected && (
            <Link
              className="buyer-chrome-bar__cta"
              href={selected.href ?? `/projects/${selected.id}`}
            >
              Open workspace <ArrowUpRight size={16} />
            </Link>
          )
        }
      >
        {selected && (
          <div className="industry-project-preview">
            <IndustryBadge
              tone={selected.status === "active" ? "success" : "neutral"}
            >
              {labelFromSnake(selected.status)}
            </IndustryBadge>
            <p>Updated {formatBuyerRelativeDate(selected.lastUpdated)}</p>
            <dl>
              <div>
                <dt>
                  {selected.workKind === "activity" ? "Guests" : "Talent"}
                </dt>
                <dd>{selected.talentCount}</dd>
              </div>
              <div>
                <dt>Castings</dt>
                <dd>{selected.castings.length}</dd>
              </div>
              <div>
                <dt>Roles</dt>
                <dd>{selected.roles.length}</dd>
              </div>
            </dl>
            <h3>Keep your next step in context</h3>
            <p>
              {selected.status === "draft"
                ? "Continue shaping the details and review your draft before publishing."
                : selected.workKind === "activity"
                  ? "Open the event to manage its details and guests."
                  : "Open this workspace to manage talent, casting details, and bookings."}
            </p>
            {selected.roles.length > 0 && (
              <ul>
                {selected.roles.map((role) => (
                  <li key={role.id}>
                    {role.title}
                    <IndustryBadge>{labelFromSnake(role.status)}</IndustryBadge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>

      <ProjectsHubFilesSection
        viewMode={viewMode}
        inboxFiles={inboxFiles}
        projects={allProjects}
        focusProjectId={viewMode === "focus" ? focusProjectId : null}
      />

      {createSheet}
    </div>
  );
}
