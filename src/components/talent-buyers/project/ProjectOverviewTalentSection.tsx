"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronDown, Filter, Loader2, Trash2, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  updateCastingCandidateStatus,
  upsertCastingEvaluation,
} from "@/app/(buyer-app)/projects/[id]/casting-workflow/actions";
import { filterCastingCandidates } from "@/lib/talent-buyers/casting/casting-filters";
import {
  castingSourceLabel,
  castingStatusLabel,
  CASTING_CANDIDATE_SOURCES,
  CASTING_STATUS_TONE_CLASSES,
  castingStatusTone,
  REVIEW_STAGE_FILTERS,
} from "@/lib/talent-buyers/casting/casting-statuses";
import type { CastingCandidate, CastingCandidateSource, ReviewStageFilter } from "@/lib/talent-buyers/casting/casting-types";
import { removeFromProjectRoster } from "@/lib/talent-buyers/project-roster";
import type { ProjectRosterMember } from "@/lib/talent-buyers/project-roster";
import { projectWorkspacePath } from "@/lib/talent-buyers/project-routes";

import { CastingCandidateDrawer } from "../casting/CastingCandidateDrawer";
import { CastingCandidateRowActions } from "../casting/CastingCandidateRowActions";
import { useToast } from "../dashboard/ToastProvider";
import { useProjectWorkspace } from "./ProjectWorkspaceContext";

import "../casting/casting-workspace.css";
import "./project-workspace.css";

type CandidateSortField = "name" | "status" | "source";
type SortDirection = "asc" | "desc";

const STAGE_FILTER_OPTIONS: { id: ReviewStageFilter | "confirmed"; label: string }[] = [
  ...REVIEW_STAGE_FILTERS.filter((stage) => stage.id !== "all").map((stage) => ({
    id: stage.id,
    label: stage.label,
  })),
  { id: "confirmed", label: "Confirmed" },
];

function sortCandidates(
  candidates: ReturnType<typeof filterCastingCandidates>,
  field: CandidateSortField,
  direction: SortDirection,
) {
  const sorted = [...candidates];
  const factor = direction === "asc" ? 1 : -1;

  sorted.sort((left, right) => {
    if (field === "name") {
      return left.displayName.localeCompare(right.displayName) * factor;
    }
    if (field === "status") {
      return castingStatusLabel(left.status).localeCompare(castingStatusLabel(right.status)) * factor;
    }
    return castingSourceLabel(left.source).localeCompare(castingSourceLabel(right.source)) * factor;
  });

  return sorted;
}

function CastingCandidateTableHeader({
  label,
  sortField,
  activeSortField,
  sortDirection,
  onSort,
  filterActive,
  filterLabel,
  onClearFilter,
  filterOpen,
  onFilterToggle,
  children,
}: {
  label: string;
  sortField: CandidateSortField;
  activeSortField: CandidateSortField;
  sortDirection: SortDirection;
  onSort: (field: CandidateSortField) => void;
  filterActive?: boolean;
  filterLabel?: string;
  onClearFilter?: () => void;
  filterOpen?: boolean;
  onFilterToggle?: () => void;
  children?: React.ReactNode;
}) {
  const isSorted = activeSortField === sortField;

  return (
    <th scope="col">
      <div className="casting-table-header">
        <button
          type="button"
          className={`casting-table-header__sort${isSorted ? " is-active" : ""}`}
          onClick={() => onSort(sortField)}
        >
          <span>{label}</span>
          {isSorted ? (
            sortDirection === "asc" ? (
              <ArrowUp className="casting-table-header__icon" aria-hidden />
            ) : (
              <ArrowDown className="casting-table-header__icon" aria-hidden />
            )
          ) : null}
        </button>

        {children && onFilterToggle ? (
          <div className="casting-table-header__filter">
            <button
              type="button"
              className={`casting-table-header__filter-trigger${filterActive || filterOpen ? " is-active" : ""}`}
              aria-haspopup="menu"
              aria-expanded={filterOpen}
              aria-label={`Filter ${label.toLowerCase()}`}
              onClick={onFilterToggle}
            >
              <Filter className="casting-table-header__icon" aria-hidden />
              {filterActive ? <span className="casting-table-header__filter-value">{filterLabel}</span> : null}
              <ChevronDown className="casting-table-header__icon" aria-hidden />
            </button>
            {children}
          </div>
        ) : null}

        {filterActive && onClearFilter ? (
          <button
            type="button"
            className="casting-table-header__clear"
            onClick={onClearFilter}
            aria-label={`Clear ${label.toLowerCase()} filter`}
          >
            <X className="casting-table-header__icon" aria-hidden />
          </button>
        ) : null}
      </div>
    </th>
  );
}

function HeaderFilterMenu({
  open,
  onClose,
  options,
  activeId,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  options: { id: string; label: string }[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="casting-table-header__menu" ref={menuRef} role="menu">
      <button
        type="button"
        role="menuitem"
        className={`casting-table-header__menu-item${activeId === "all" ? " is-active" : ""}`}
        onClick={() => {
          onSelect("all");
          onClose();
        }}
      >
        All
      </button>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="menuitem"
          className={`casting-table-header__menu-item${activeId === option.id ? " is-active" : ""}`}
          onClick={() => {
            onSelect(option.id);
            onClose();
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ProjectTalentCard({
  member,
  onRemove,
  isRemoving,
}: {
  member: ProjectRosterMember;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  const initial = member.name.charAt(0).toUpperCase();

  return (
    <article className="bd-row-card">
      <div className="flex gap-4">
        <div className="relative w-20 shrink-0 overflow-hidden rounded-xl bg-white/6 sm:w-24">
          {member.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.avatarUrl} alt="" className="size-full min-h-[96px] object-cover" />
          ) : (
            <div className="flex size-full min-h-[96px] items-center justify-center text-2xl font-semibold text-white/42">
              {initial}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 py-1">
          <h3 className="text-base font-semibold text-white/92">{member.name}</h3>
          {member.notes ? <p className="mt-1 text-sm text-white/50 line-clamp-2">{member.notes}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {member.slug ? (
              <Link href={`/talent/${member.slug}`} className="text-sm font-medium text-[var(--accent)] hover:underline">
                View profile
              </Link>
            ) : null}
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm font-medium text-white/45 hover:text-red-400"
              onClick={onRemove}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-3.5" aria-hidden />
              )}
              Remove
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProjectOverviewTalentSection({
  projectId,
  rosterMembers,
  variant,
  title = "Talent",
}: {
  projectId: string;
  rosterMembers: ProjectRosterMember[];
  variant: "casting-candidates" | "roster";
  title?: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const { showToast } = useToast();
  const { castingWorkflow, project, projectId: workspaceProjectId, currentUserId } = useProjectWorkspace();
  const [activeCandidate, setActiveCandidate] = useState<CastingCandidate | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<ReviewStageFilter | "confirmed" | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<CastingCandidateSource | "all">("all");
  const [sortField, setSortField] = useState<CandidateSortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [stageMenuOpen, setStageMenuOpen] = useState(false);
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const candidates = useMemo(() => {
    if (!castingWorkflow?.candidates.length) return [];

    const filtered =
      stageFilter === "confirmed"
        ? castingWorkflow.candidates.filter((candidate) => candidate.status === "confirmed")
        : filterCastingCandidates(castingWorkflow.candidates, {
            query,
            stage: stageFilter,
            source: sourceFilter,
          });

    const searched =
      stageFilter === "confirmed"
        ? filterCastingCandidates(filtered, { query, source: sourceFilter })
        : filtered;

    return sortCandidates(searched, sortField, sortDirection);
  }, [
    castingWorkflow?.candidates,
    query,
    sortDirection,
    sortField,
    sourceFilter,
    stageFilter,
  ]);

  function handleSort(field: CandidateSortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDirection("asc");
  }

  const activeStageLabel =
    stageFilter === "all"
      ? undefined
      : STAGE_FILTER_OPTIONS.find((option) => option.id === stageFilter)?.label;
  const activeSourceLabel = sourceFilter === "all" ? undefined : castingSourceLabel(sourceFilter);

  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#talent") return;
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  function handleRemove(memberId: string) {
    setRemovingId(memberId);
    startTransition(async () => {
      const result = await removeFromProjectRoster(projectId, memberId);
      setRemovingId(null);
      if (!result.ok) {
        showToast({ message: result.error ?? "Could not remove talent.", variant: "error" });
        return;
      }
      showToast("Removed from project roster.");
      router.refresh();
    });
  }

  function moveCandidate(candidateId: string, status: CastingCandidate["status"], notify = false) {
    startTransition(async () => {
      const result = await updateCastingCandidateStatus({
        projectId: workspaceProjectId,
        candidateId,
        status,
        notifyTalent: notify,
      });
      if (!result.ok) {
        showToast({ message: result.error ?? "Update failed", variant: "error" });
        return;
      }
      showToast({ message: `Moved to ${castingStatusLabel(status)}`, variant: "success" });
      router.refresh();
    });
  }

  const workflowEvaluations = castingWorkflow?.evaluations ?? [];

  return (
    <section
      ref={sectionRef}
      id="talent"
      className="project-workspace__overview-section"
      aria-labelledby="overview-talent-heading"
    >
      <div
        className={`project-workspace__overview-section-header${
          variant === "casting-candidates" ? " project-workspace__overview-section-header--candidates" : ""
        }`}
      >
        <div>
          <h3 id="overview-talent-heading" className="project-workspace__overview-section-title">
            {variant === "casting-candidates" ? "Candidates" : title}
          </h3>
          <p className="project-workspace__overview-section-description">
            {variant === "casting-candidates"
              ? "Everyone connected to this casting project."
              : "Project roster and attached talent."}
          </p>
        </div>
        {variant === "casting-candidates" ? (
          <input
            type="search"
            className="casting-input project-workspace__overview-search"
            placeholder="Search candidates"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search candidates"
          />
        ) : (
          <Link href={`/talent?projectId=${projectId}`} className="bd-btn-secondary inline-flex items-center gap-1.5 text-sm">
            <UserPlus className="size-4" aria-hidden />
            Add talent
          </Link>
        )}
      </div>

      {variant === "casting-candidates" ? (
        <>
          {candidates.length === 0 ? (
            <div className="project-workspace__empty">
              <p className="project-workspace__empty-title">No candidates yet</p>
              <p className="project-workspace__empty-text">
                Discover talent in Talent Search or collect submissions through Outreach.
              </p>
              <Link href={projectWorkspacePath(projectId, "talent-search")} className="bd-btn-secondary text-sm">
                Find talent
              </Link>
            </div>
          ) : (
            <div className="casting-table-wrap">
              <table className="casting-table">
                <thead>
                  <tr>
                    <CastingCandidateTableHeader
                      label="Talent"
                      sortField="name"
                      activeSortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <CastingCandidateTableHeader
                      label="Stage"
                      sortField="status"
                      activeSortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      filterActive={stageFilter !== "all"}
                      filterLabel={activeStageLabel}
                      onClearFilter={() => setStageFilter("all")}
                      filterOpen={stageMenuOpen}
                      onFilterToggle={() => {
                        setSourceMenuOpen(false);
                        setStageMenuOpen((current) => !current);
                      }}
                    >
                      <HeaderFilterMenu
                        open={stageMenuOpen}
                        onClose={() => setStageMenuOpen(false)}
                        activeId={stageFilter}
                        options={STAGE_FILTER_OPTIONS}
                        onSelect={(id) => setStageFilter(id as ReviewStageFilter | "confirmed" | "all")}
                      />
                    </CastingCandidateTableHeader>
                    <CastingCandidateTableHeader
                      label="Source"
                      sortField="source"
                      activeSortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      filterActive={sourceFilter !== "all"}
                      filterLabel={activeSourceLabel}
                      onClearFilter={() => setSourceFilter("all")}
                      filterOpen={sourceMenuOpen}
                      onFilterToggle={() => {
                        setStageMenuOpen(false);
                        setSourceMenuOpen((current) => !current);
                      }}
                    >
                      <HeaderFilterMenu
                        open={sourceMenuOpen}
                        onClose={() => setSourceMenuOpen(false)}
                        activeId={sourceFilter}
                        options={CASTING_CANDIDATE_SOURCES.map((source) => ({
                          id: source,
                          label: castingSourceLabel(source),
                        }))}
                        onSelect={(id) => setSourceFilter(id as CastingCandidateSource | "all")}
                      />
                    </CastingCandidateTableHeader>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate) => (
                    <tr
                      key={candidate.id}
                      className="casting-table-row casting-table-row--clickable"
                      onClick={() => setActiveCandidate(candidate)}
                    >
                      <td>
                        <div className="casting-table-talent-cell">
                          <div className="casting-table-talent-cell__identity">
                            {candidate.headshotUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={candidate.headshotUrl}
                                alt=""
                                className="casting-table-talent-cell__avatar"
                              />
                            ) : (
                              <span className="casting-table-talent-cell__avatar casting-table-talent-cell__avatar--fallback" aria-hidden>
                                {candidate.displayName.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <span className="casting-table-talent-cell__name">{candidate.displayName}</span>
                          </div>
                          <CastingCandidateRowActions
                            candidate={candidate}
                            projectId={projectId}
                            projectTitle={project.title}
                          />
                        </div>
                      </td>
                      <td>
                        <span className={`casting-status-pill ${CASTING_STATUS_TONE_CLASSES[castingStatusTone(candidate.status)]}`}>
                          {castingStatusLabel(candidate.status)}
                        </span>
                      </td>
                      <td>{castingSourceLabel(candidate.source)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : rosterMembers.length === 0 ? (
        <div className="project-workspace__empty">
          <p className="project-workspace__empty-title">No talent on this project</p>
          <p className="project-workspace__empty-text">
            Add dancers from your talent library to build a project-level roster.
          </p>
          <Link href={`/talent?projectId=${projectId}`} className="bd-btn-secondary inline-flex items-center gap-1.5 text-sm">
            <UserPlus className="size-4" aria-hidden />
            Browse talent
          </Link>
        </div>
      ) : (
        <div className="project-workspace__talent-grid">
          {rosterMembers.map((member) => (
            <ProjectTalentCard
              key={member.id}
              member={member}
              onRemove={() => handleRemove(member.id)}
              isRemoving={isPending && removingId === member.id}
            />
          ))}
        </div>
      )}
      {variant === "casting-candidates" && activeCandidate ? (
        <CastingCandidateDrawer
          candidate={activeCandidate}
          evaluations={workflowEvaluations.filter((evaluation) => evaluation.castingCandidateId === activeCandidate.id)}
          currentUserId={currentUserId}
          onClose={() => setActiveCandidate(null)}
          onStatusChange={(status, notify) => moveCandidate(activeCandidate.id, status, notify)}
          onSaveEvaluation={(input) => {
            startTransition(async () => {
              await upsertCastingEvaluation({
                projectId: workspaceProjectId,
                candidateId: activeCandidate.id,
                ...input,
              });
              showToast({ message: "Evaluation saved", variant: "success" });
              router.refresh();
            });
          }}
        />
      ) : null}
    </section>
  );
}
