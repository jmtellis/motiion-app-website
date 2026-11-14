"use client";

import { FilterSelect } from "@/components/ui/FilterSelect";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { castingReviewEmptyState, isCastingFullyFinalized } from "@/lib/talent-buyers/casting/casting-completion";
import { useMemo, useState, useTransition } from "react";
import { ListPlus, X } from "lucide-react";

import {
  updateCastingCandidateStatus,
  upsertCastingEvaluation,
} from "@/app/(buyer-app)/(paid)/projects/[id]/casting-workflow/actions";
import {
  filterCastingCandidates,
  roleMatchIds,
} from "@/lib/talent-buyers/casting/casting-filters";
import { isReviewableCastingCandidate } from "@/lib/talent-buyers/casting/casting-statuses";
import type {
  CastingCandidate,
  CastingCandidateStatus,
  CastingRole,
} from "@/lib/talent-buyers/casting/casting-types";

import { EmptyState } from "@/components/talent-buyers/dashboard/EmptyState";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { useProjectWorkspace } from "@/components/talent-buyers/project/ProjectWorkspaceContext";

import { CastingCandidateDrawer } from "./CastingCandidateDrawer";
import { PROFILE_DRAG_MIME } from "./CastingTalentCarousel";

import "./casting-workspace.css";

const SHORTLIST_STATUSES: CastingCandidateStatus[] = ["shortlisted"];
const SUBMISSION_QUEUE_STATUSES: CastingCandidateStatus[] = [
  "submitted",
  "in_review",
];

function replaceReviewQuery(params: { role: string }) {
  const next = new URLSearchParams();
  next.set("role", params.role);
  const query = next.toString();
  window.history.replaceState(
    null,
    "",
    query ? `?${query}` : window.location.pathname,
  );
}

function candidateMatchesRole(
  candidate: CastingCandidate,
  roleId: string,
  roles: CastingRole[],
) {
  if (roleId === "all") return true;
  const role = roles.find(
    (item) => item.id === roleId || item.bridgedRoleId === roleId,
  );
  if (!role) return candidate.roleIds.includes(roleId);
  const ids = roleMatchIds(role);
  return candidate.roleIds.some((id) => ids.includes(id));
}

export function CastingReviewPanel({ roleScoped = false, mode = "review" }: { roleScoped?: boolean; mode?: "review" | "shortlist" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { projectId, project, castingWorkflow, currentUserId } = useProjectWorkspace();
  const canReview = project.canReviewCasting !== false;
  const [activeCandidate, setActiveCandidate] =
    useState<CastingCandidate | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [pendingShortlistIds, setPendingShortlistIds] = useState<Set<string>>(
    new Set(),
  );
  const [isPending, startTransition] = useTransition();
  const [roleFilter, setRoleFilter] = useState(
    searchParams.get("role") ?? "all",
  );

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
        .filter((candidate) =>
          candidateMatchesRole(candidate, roleFilter, workflow.roles),
        ),
    [workflow.candidates, workflow.roles, roleFilter],
  );

  const shortlisted = useMemo(
    () =>
      roleScopedCandidates.filter((candidate) =>
        SHORTLIST_STATUSES.includes(candidate.status),
      ),
    [roleScopedCandidates],
  );

  const reviewFinalized = isCastingFullyFinalized(workflow.roles.filter((role) => roleFilter === "all" || role.id === roleFilter || role.bridgedRoleId === roleFilter));
  const reviewEmptyState = castingReviewEmptyState({ finalized: reviewFinalized, reviewedCount: roleScopedCandidates.length, shortlistedCount: shortlisted.length });

  const shortlistedIds = useMemo(
    () => new Set(shortlisted.map((candidate) => candidate.id)),
    [shortlisted],
  );

  const confirmedPendingIds = [...pendingShortlistIds].filter((id) => shortlistedIds.has(id));
  if (confirmedPendingIds.length) {
    setPendingShortlistIds(new Set([...pendingShortlistIds].filter((id) => !shortlistedIds.has(id))));
  }

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

  const visibleCandidates = mode === "shortlist" ? shortlisted : submissions;

  function setRoleFilterValue(next: string) {
    setRoleFilter(next);
    replaceReviewQuery({ role: next });
  }

  function moveCandidate(candidateId: string, status: CastingCandidateStatus) {
    if (!canReview) return;
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
        showToast({
          message: result.error ?? "Update failed",
          variant: "error",
        });
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
    if (
      shortlistedIds.has(candidate.id) ||
      pendingShortlistIds.has(candidate.id)
    )
      return;
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
    <FilterSelect label="Role" value={roleFilter} onChange={setRoleFilterValue} options={[{ value: "all", label: "All roles" }, ...workflow.roles.map((role) => ({ value: role.bridgedRoleId ?? role.id, label: role.name }))]} />
  );

  return (
    <>
      <div
        className="project-workspace__panel-body casting-review"
      >
        {!canReview && <p className="ui-state" role="status">You can view applicants. The project owner or an admin manages review decisions.</p>}
        <div className="casting-review__layout">
          <div className="casting-review__main">
            <div className="casting-review__toolbar">
              {roleScoped ? null : roleToggle}
              {mode === "shortlist" ? <Link className="bd-btn-secondary" href={`/projects/${projectId}/workspace/client-review?role=${encodeURIComponent(roleFilter)}`}>Share shortlist & feedback</Link> : null}
              <span className="text-sm text-[var(--ui-muted)]">{mode === "shortlist" ? `${shortlisted.length} shortlisted` : `${submissions.length} awaiting review`}</span>
            </div>

            {!visibleCandidates.length ? (
              <EmptyState
                variant="dashboard"
                title={mode === "shortlist" ? "No shortlisted talent yet" : reviewEmptyState.title}
                description={mode === "shortlist" ? "Shortlist talent while reviewing submissions to compare them here." : reviewEmptyState.description}
                actionLabel={mode === "shortlist" ? "Review submissions" : reviewEmptyState.action === "cast" ? "View final selections" : "Invite talent"}
                actionHref={`/projects/${projectId}/workspace/${mode === "shortlist" ? "review" : reviewEmptyState.action === "cast" ? "cast" : "talent-search"}?role=${encodeURIComponent(roleFilter)}`}

              />
            ) : null}

            {visibleCandidates.length > 0 ? (
              <ul className="casting-candidate-grid casting-review__grid">
                {visibleCandidates.map((candidate) => (
                  <li key={candidate.id}>
                    <article
                      className="casting-candidate-card casting-review__draggable-card"
                      draggable={canReview && !roleScoped}
                      onDragStart={(event) => {
                        event.dataTransfer.setData(
                          PROFILE_DRAG_MIME,
                          candidate.id,
                        );
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
                            <span className="casting-review__card-meta">
                              Independent
                            </span>
                          )}
                        </div>
                      </button>
                      <button
                        type="button"
                        className="casting-review__card-shortlist"
                        disabled={
                          isPending || !canReview || pendingShortlistIds.has(candidate.id)
                        }
                        aria-label={`${mode === "shortlist" ? "Remove" : "Add"} ${candidate.displayName} ${mode === "shortlist" ? "from" : "to"} shortlist`}
                        title={mode === "shortlist" ? "Remove from shortlist" : "Add to shortlist"}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (mode === "shortlist") unshortlistCandidate(candidate); else shortlistCandidate(candidate);
                        }}
                      >
                        {mode === "shortlist" ? <X className="size-4" aria-hidden /> : <ListPlus className="size-4" aria-hidden />}
                      </button>
                    </article>
                  </li>
                ))}
              </ul>
            ) : null}


          </div>

          {!roleScoped ? <section
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
              <h3 id="casting-shortlist-heading">
                {reviewFinalized && !shortlisted.length ? "Review complete" : `Shortlist (${shortlisted.length})`}
              </h3>
            </div>

            {shortlisted.length === 0 ? (
              <div className="casting-find-talent-dropzone">
                {reviewFinalized ? <><p>Final selections are saved in Cast.</p><Link href={`/projects/${projectId}/workspace/cast`} className="bd-btn-secondary">View selections</Link></> : <p>Use the shortlist button on a submission, or drag it here.</p>}
              </div>
            ) : (
              <ul className="casting-find-talent-invite-list">
                {shortlisted.map((candidate) => (
                  <li
                    key={candidate.id}
                    className="casting-find-talent-invite-item"
                  >
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
                        <span className="casting-find-talent-invite-item__status">
                          Shortlisted
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="casting-find-talent-invite-item__remove"
                      onClick={() => unshortlistCandidate(candidate)}
                      aria-label={`Remove ${candidate.displayName} from shortlist`}
                      title="Remove from shortlist"
                      disabled={isPending || !canReview}
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {shortlisted.length > 0 ? <Link className="bd-btn-secondary" href={`/projects/${projectId}/workspace/client-review`}>Share shortlist & review feedback</Link> : null}
          </section> : null}
        </div>
      </div>

      {activeCandidate ? (
        <CastingCandidateDrawer
          candidate={activeCandidate}
          evaluations={workflow.evaluations.filter(
            (evaluation) =>
              evaluation.castingCandidateId === activeCandidate.id,
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
