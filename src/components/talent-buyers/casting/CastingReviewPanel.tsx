"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ListPlus, X } from "lucide-react";

import {
  updateCastingCandidateStatus,
  upsertCastingEvaluation,
} from "@/app/(buyer-app)/(paid)/projects/[id]/casting-workflow/actions";
import {
  deriveCastingWorkflowState,
  getCastingPanelHeader,
  getCastingPrimaryAction,
} from "@/lib/talent-buyers/casting/casting-navigation";
import {
  filterCastingCandidates,
  roleMatchIds,
} from "@/lib/talent-buyers/casting/casting-filters";
import { isReviewableCastingCandidate } from "@/lib/talent-buyers/casting/casting-statuses";
import type {
  CastingCandidate,
  CastingCandidateStatus,
  CastingRole,
  ReviewViewMode,
} from "@/lib/talent-buyers/casting/casting-types";
import { castingWorkspaceHref } from "@/lib/talent-buyers/casting/casting-routes";

import { EmptyState } from "@/components/talent-buyers/dashboard/EmptyState";
import { SegmentedControl } from "@/components/talent-buyers/dashboard/SegmentedControl";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { useProjectWorkspace } from "@/components/talent-buyers/project/ProjectWorkspaceContext";

import { CastingCandidateDrawer } from "./CastingCandidateDrawer";
import { CastingPanelHeader } from "./CastingPanelHeader";
import { CastingReviewFocusProfile } from "./CastingReviewFocusProfile";
import { PROFILE_DRAG_MIME } from "./CastingTalentCarousel";

import "./casting-workspace.css";

const VIEW_MODES: { value: ReviewViewMode; label: string }[] = [
  { value: "cards", label: "Cards" },
  { value: "focus", label: "Focus" },
];

const SHORTLIST_STATUSES: CastingCandidateStatus[] = ["shortlisted"];
const SUBMISSION_QUEUE_STATUSES: CastingCandidateStatus[] = ["submitted", "in_review"];

function replaceReviewQuery(params: { role: string }) {
  const next = new URLSearchParams();
  next.set("role", params.role);
  const query = next.toString();
  window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
}

function candidateMatchesRole(
  candidate: CastingCandidate,
  roleId: string,
  roles: CastingRole[],
) {
  if (roleId === "all") return true;
  const role = roles.find((item) => item.id === roleId || item.bridgedRoleId === roleId);
  if (!role) return candidate.roleIds.includes(roleId);
  const ids = roleMatchIds(role);
  return candidate.roleIds.some((id) => ids.includes(id));
}

export function CastingReviewPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { projectId, castingWorkflow, currentUserId } = useProjectWorkspace();
  const [viewMode, setViewMode] = useState<ReviewViewMode>("cards");
  const [activeCandidate, setActiveCandidate] = useState<CastingCandidate | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const [dropActive, setDropActive] = useState(false);
  const [pendingShortlistIds, setPendingShortlistIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [roleFilter, setRoleFilter] = useState(searchParams.get("role") ?? "all");

  const workflow = castingWorkflow ?? {
    primaryCasting: null,
    roles: [],
    candidates: [],
    invitations: [],
    referrals: [],
    externalCandidates: [],
    evaluations: [],
  };

  const roleScopedCandidates = useMemo(
    () =>
      workflow.candidates
        .filter(isReviewableCastingCandidate)
        .filter((candidate) => candidateMatchesRole(candidate, roleFilter, workflow.roles)),
    [workflow.candidates, workflow.roles, roleFilter],
  );

  const shortlisted = useMemo(
    () =>
      roleScopedCandidates.filter((candidate) => SHORTLIST_STATUSES.includes(candidate.status)),
    [roleScopedCandidates],
  );

  const shortlistedIds = useMemo(
    () => new Set(shortlisted.map((candidate) => candidate.id)),
    [shortlisted],
  );

  useEffect(() => {
    if (!pendingShortlistIds.size) return;
    setPendingShortlistIds((current) => {
      const next = new Set<string>();
      for (const id of current) {
        if (!shortlistedIds.has(id)) next.add(id);
      }
      return next.size === current.size ? current : next;
    });
  }, [shortlistedIds, pendingShortlistIds.size]);

  const submissions = useMemo(
    () =>
      filterCastingCandidates(
        roleScopedCandidates.filter(
          (candidate) =>
            SUBMISSION_QUEUE_STATUSES.includes(candidate.status) &&
            !shortlistedIds.has(candidate.id) &&
            !pendingShortlistIds.has(candidate.id),
        ),
        { sort: "updated" },
      ),
    [roleScopedCandidates, shortlistedIds, pendingShortlistIds],
  );

  function setRoleFilterValue(next: string) {
    setRoleFilter(next);
    setFocusIndex(0);
    replaceReviewQuery({ role: next });
  }

  const state = deriveCastingWorkflowState({ ...workflow, candidates: roleScopedCandidates });
  const header = getCastingPanelHeader("review");
  const primaryAction = {
    ...getCastingPrimaryAction("review", state),
    label: "Go to Cast",
    actionId: "go-to-cast",
    disabled: shortlisted.length === 0,
  };

  useEffect(() => {
    if (!submissions.length) {
      setFocusIndex(0);
      return;
    }
    if (focusIndex > submissions.length - 1) {
      setFocusIndex(submissions.length - 1);
    }
  }, [submissions.length, focusIndex]);

  const focusCandidate =
    submissions[Math.min(focusIndex, Math.max(submissions.length - 1, 0))] ?? null;

  function moveCandidate(candidateId: string, status: CastingCandidateStatus) {
    startTransition(async () => {
      const result = await updateCastingCandidateStatus({
        projectId,
        candidateId,
        status,
        notifyTalent: false,
      });
      if (!result.ok) {
        setPendingShortlistIds((current) => {
          if (!current.has(candidateId)) return current;
          const next = new Set(current);
          next.delete(candidateId);
          return next;
        });
        showToast({ message: result.error ?? "Update failed", variant: "error" });
        return;
      }
      showToast({
        message:
          status === "shortlisted"
            ? "Added to shortlist"
            : status === "submitted"
              ? "Removed from shortlist"
              : "Updated",
        variant: "success",
      });
      router.refresh();
    });
  }

  function shortlistCandidate(candidate: CastingCandidate) {
    if (shortlistedIds.has(candidate.id) || pendingShortlistIds.has(candidate.id)) return;
    setPendingShortlistIds((current) => new Set(current).add(candidate.id));
    moveCandidate(candidate.id, "shortlisted");
  }

  function unshortlistCandidate(candidate: CastingCandidate) {
    setPendingShortlistIds((current) => {
      if (!current.has(candidate.id)) return current;
      const next = new Set(current);
      next.delete(candidate.id);
      return next;
    });
    moveCandidate(candidate.id, "submitted");
  }

  function handlePrimaryAction(actionId: string) {
    if (actionId === "go-to-cast" || actionId === "review-next") {
      router.push(castingWorkspaceHref(projectId, "cast"));
    }
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setDropActive(false);
    const candidateId = event.dataTransfer.getData(PROFILE_DRAG_MIME);
    if (!candidateId) return;
    const candidate = submissions.find((item) => item.id === candidateId);
    if (!candidate) return;
    shortlistCandidate(candidate);
  }

  const roleToggle = (
    <label className="casting-find-talent-role-pill">
      <span className="sr-only">Role</span>
      <select
        value={roleFilter}
        onChange={(event) => setRoleFilterValue(event.target.value)}
        className="casting-find-talent-role-pill__select"
        aria-label="Role"
      >
        <option value="all">All roles</option>
        {workflow.roles.map((role) => (
          <option key={role.id} value={role.bridgedRoleId ?? role.id}>
            {role.name}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <>
      <CastingPanelHeader
        title={header.title}
        center={roleToggle}
        primaryAction={primaryAction}
        onPrimaryAction={handlePrimaryAction}
      />

      <div
        className={`project-workspace__panel-body casting-review${
          viewMode === "focus" ? " casting-review--focus" : ""
        }`}
      >
        <div className="casting-review__layout">
          <div className="casting-review__main">
            <div className="casting-review__toolbar">
              <span className="casting-review__toolbar-spacer" aria-hidden />
              <div className="casting-review__toolbar-center">
                <SegmentedControl
                  options={VIEW_MODES}
                  value={viewMode}
                  onChange={setViewMode}
                  ariaLabel="Review view mode"
                  hug
                />
              </div>
              {viewMode === "focus" && focusCandidate ? (
                <button
                  type="button"
                  className="bd-btn-accent casting-review__toolbar-shortlist"
                  disabled={isPending}
                  onClick={() => shortlistCandidate(focusCandidate)}
                >
                  Shortlist
                </button>
              ) : (
                <span className="casting-review__toolbar-spacer" aria-hidden />
              )}
            </div>

            {!submissions.length ? (
              <EmptyState
                variant="dashboard"
                title={
                  shortlisted.length || roleScopedCandidates.length
                    ? "All submissions are shortlisted"
                    : "No submissions to review"
                }
                description={
                  shortlisted.length || roleScopedCandidates.length
                    ? "Remove someone from the shortlist rail to keep reviewing, or continue to Cast."
                    : "Invite talent and wait for submissions, or add candidates from Find Talent."
                }
                actionLabel={
                  shortlisted.length || roleScopedCandidates.length ? undefined : "Find talent"
                }
                actionHref={
                  shortlisted.length || roleScopedCandidates.length
                    ? undefined
                    : `/projects/${projectId}/workspace/talent-search`
                }
              />
            ) : null}

            {submissions.length > 0 && viewMode === "cards" ? (
              <ul className="casting-candidate-grid casting-review__grid">
                {submissions.map((candidate) => (
                  <li key={candidate.id}>
                    <article
                      className="casting-candidate-card casting-review__draggable-card"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData(PROFILE_DRAG_MIME, candidate.id);
                        event.dataTransfer.effectAllowed = "copy";
                      }}
                    >
                      <button
                        type="button"
                        className="casting-candidate-card__button"
                        onClick={() => setActiveCandidate(candidate)}
                      >
                        {candidate.headshotUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={candidate.headshotUrl}
                            alt=""
                            className="casting-candidate-card__photo"
                            draggable={false}
                          />
                        ) : (
                          <div className="casting-candidate-card__photo casting-candidate-card__photo--empty" />
                        )}
                        <div className="casting-candidate-card__body">
                          <strong>{candidate.displayName}</strong>
                          {candidate.agency?.trim() ? (
                            <span className="casting-review__card-meta">
                              {candidate.agency.trim()}
                            </span>
                          ) : (
                            <span className="casting-review__card-meta">Independent</span>
                          )}
                        </div>
                      </button>
                      <button
                        type="button"
                        className="casting-review__card-shortlist"
                        disabled={isPending || pendingShortlistIds.has(candidate.id)}
                        aria-label={`Add ${candidate.displayName} to shortlist`}
                        title="Add to shortlist"
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          shortlistCandidate(candidate);
                        }}
                      >
                        <ListPlus className="size-4" aria-hidden />
                      </button>
                    </article>
                  </li>
                ))}
              </ul>
            ) : null}

            {submissions.length > 0 && viewMode === "focus" && focusCandidate ? (
              <CastingReviewFocusProfile
                candidate={focusCandidate}
                indexLabel={`${focusIndex + 1} of ${submissions.length}`}
                canGoPrevious={submissions.length > 1}
                canGoNext={submissions.length > 1}
                isPending={isPending}
                onPrevious={() =>
                  setFocusIndex((i) => (i - 1 + submissions.length) % submissions.length)
                }
                onNext={() => setFocusIndex((i) => (i + 1) % submissions.length)}
              />
            ) : null}
          </div>

          <section
            className={`casting-find-talent-invited-panel casting-review__shortlist${
              dropActive ? " is-drop-active" : ""
            }`}
            aria-labelledby="casting-shortlist-heading"
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
              setDropActive(true);
            }}
            onDragLeave={() => setDropActive(false)}
            onDrop={handleDrop}
          >
              <div className="casting-find-talent-board__section-header">
                <h3 id="casting-shortlist-heading">Shortlist ({shortlisted.length})</h3>
              </div>

              {shortlisted.length === 0 ? (
                <div className="casting-find-talent-dropzone">
                  <p>Drop submissions here to shortlist.</p>
                </div>
              ) : (
                <ul className="casting-find-talent-invite-list">
                  {shortlisted.map((candidate) => (
                    <li key={candidate.id} className="casting-find-talent-invite-item">
                      <div className="casting-find-talent-invite-item__identity">
                        {candidate.headshotUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={candidate.headshotUrl}
                            alt=""
                            className="casting-find-talent-invite-item__avatar"
                          />
                        ) : (
                          <div className="casting-find-talent-invite-item__avatar casting-review__avatar-empty" />
                        )}
                        <div className="casting-find-talent-invite-item__main">
                          <button
                            type="button"
                            className="casting-find-talent-invite-item__name casting-review__shortlist-name"
                            onClick={() => setActiveCandidate(candidate)}
                          >
                            {candidate.displayName}
                          </button>
                          <span className="casting-find-talent-invite-item__status">Shortlisted</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="casting-find-talent-invite-item__remove"
                        onClick={() => unshortlistCandidate(candidate)}
                        aria-label={`Remove ${candidate.displayName} from shortlist`}
                        title="Remove from shortlist"
                        disabled={isPending}
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
        </div>
      </div>

      {activeCandidate ? (
        <CastingCandidateDrawer
          candidate={activeCandidate}
          evaluations={workflow.evaluations.filter(
            (evaluation) => evaluation.castingCandidateId === activeCandidate.id,
          )}
          currentUserId={currentUserId}
          onClose={() => setActiveCandidate(null)}
          onStatusChange={(status) => moveCandidate(activeCandidate.id, status)}
          onSaveEvaluation={(input) => {
            startTransition(async () => {
              await upsertCastingEvaluation({
                projectId,
                candidateId: activeCandidate.id,
                ...input,
              });
              showToast({ message: "Evaluation saved", variant: "success" });
              router.refresh();
            });
          }}
        />
      ) : null}
    </>
  );
}
