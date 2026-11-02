"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { isCastingFullyFinalized } from "@/lib/talent-buyers/casting/casting-completion";
import { useMemo, useRef, useState, useTransition } from "react";

import {
  createJobFromCasting,
  finalizeCastingRole,
  reopenFinalizedCastingRole,
  updateCastingCandidateStatus,
} from "@/app/(buyer-app)/(paid)/projects/[id]/casting-workflow/actions";
import {
  getCastingPanelHeader,
} from "@/lib/talent-buyers/casting/casting-navigation";
import { roleMatchIds } from "@/lib/talent-buyers/casting/casting-filters";
import { castingWorkspaceHref } from "@/lib/talent-buyers/casting/casting-routes";
import type {
  CastingCandidate,
  CastingCandidateStatus,
  CastingRole,
} from "@/lib/talent-buyers/casting/casting-types";
import {
  fetchShortlistVoteTalliesForRoles,
  type ShortlistVoteTally,
} from "@/lib/talent-buyers/shortlist-shares";

import { EmptyState } from "@/components/talent-buyers/dashboard/EmptyState";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { useIndustryProOptional } from "@/components/talent-buyers/billing/IndustryProContext";
import { useProjectWorkspace } from "@/components/talent-buyers/project/ProjectWorkspaceContext";

import { CastingFinalSelectsRail } from "./CastingFinalSelectsRail";
import { CastingPanelHeader } from "./CastingPanelHeader";
import { useCastingClientResource } from "./useCastingClientResource";

import "./casting-workspace.css";

const POOL_STATUSES: CastingCandidateStatus[] = [
  "shortlisted",
  "callback",
  "selected",
  "availability_requested",
  "offer_sent",
  "accepted",
  "confirmed",
];

const FINAL_SELECT_STATUSES: CastingCandidateStatus[] = [
  "selected",
  "availability_requested",
  "offer_sent",
  "accepted",
  "confirmed",
];

const TOGGLEABLE_FINAL_SELECT: CastingCandidateStatus[] = ["selected", "availability_requested"];

function isPoolCandidate(candidate: CastingCandidate) {
  return POOL_STATUSES.includes(candidate.status);
}

function isFinalSelectCandidate(candidate: CastingCandidate) {
  return FINAL_SELECT_STATUSES.includes(candidate.status);
}

function candidatesForRole(candidates: CastingCandidate[], role: CastingRole): CastingCandidate[] {
  const ids = roleMatchIds(role);
  return candidates.filter((candidate) => candidate.roleIds.some((roleId) => ids.includes(roleId)));
}

function roleForCandidate(candidate: CastingCandidate, roles: CastingRole[]): CastingRole | null {
  return (
    roles.find((role) => candidate.roleIds.some((id) => roleMatchIds(role).includes(id))) ?? null
  );
}

function isRoleFinalized(role: CastingRole | null | undefined) {
  return Boolean(role?.isCastingFinalized);
}

function voteLabel(tally: ShortlistVoteTally | undefined) {
  if (!tally || (tally.yesCount === 0 && tally.noCount === 0)) return "—";
  return `${tally.yesCount} yes / ${tally.noCount} no`;
}

const EMPTY_TALLIES: Record<string, ShortlistVoteTally> = {};
async function loadClientTallies(roleIds: string[]) {
  const result = await fetchShortlistVoteTalliesForRoles(roleIds);
  return { data: result.talliesBySubmissionId, error: result.error };
}

export function CastingCastPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { requirePro } = useIndustryProOptional();
  const { projectId, project, castingWorkflow } = useProjectWorkspace();
  const canReviewCasting = project.canReviewCasting !== false;
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const requestedRole = searchParams.get("role") ?? "all";
  const mutationBusy = useRef(false);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, CastingCandidateStatus>>({});

  const workflow = castingWorkflow ?? {
    primaryCasting: null,
    roles: [],
    candidates: [],
    invitations: [],
    referrals: [],
    externalCandidates: [],
    evaluations: [],
  };

  const roles = workflow.roles;
  const requestedRoleMatch = roles.find((role) => role.id === requestedRole || role.bridgedRoleId === requestedRole);
  const roleFilter = requestedRoleMatch ? requestedRoleMatch.bridgedRoleId ?? requestedRoleMatch.id : "all";
  const header = getCastingPanelHeader("cast");
  const castingTitle = workflow.primaryCasting?.title?.trim() || "Casting";

  const candidatesWithOverrides = useMemo(
    () =>
      workflow.candidates.map((candidate) => {
        const override = statusOverrides[candidate.id];
        return override ? { ...candidate, status: override } : candidate;
      }),
    [statusOverrides, workflow.candidates],
  );

  const selectedRole =
    roleFilter === "all"
      ? null
      : (roles.find((role) => role.id === roleFilter || role.bridgedRoleId === roleFilter) ?? null);

  const roleScopedCandidates = useMemo(() => {
    if (roleFilter === "all") return candidatesWithOverrides;
    return selectedRole ? candidatesForRole(candidatesWithOverrides, selectedRole) : [];
  }, [candidatesWithOverrides, roleFilter, selectedRole]);

  const poolCandidates = useMemo(
    () => roleScopedCandidates.filter(isPoolCandidate),
    [roleScopedCandidates],
  );

  const finalSelectCandidates = useMemo(
    () => roleScopedCandidates.filter(isFinalSelectCandidate),
    [roleScopedCandidates],
  );

  const scopedRoles = useMemo(() => {
    if (roleFilter === "all") return roles;
    return selectedRole ? [selectedRole] : [];
  }, [roleFilter, roles, selectedRole]);

  const selectionsLocked = isCastingFullyFinalized(scopedRoles);

  const listRoleIds = useMemo(
    () =>
      roleFilter === "all"
        ? roles.map((role) => role.bridgedRoleId ?? role.id).filter(Boolean)
        : selectedRole
          ? [selectedRole.bridgedRoleId ?? selectedRole.id].filter(Boolean)
          : [],
    [roleFilter, roles, selectedRole],
  );

  const [previousCandidates, setPreviousCandidates] = useState(workflow.candidates);
  if (previousCandidates !== workflow.candidates) {
    setPreviousCandidates(workflow.candidates);
    setStatusOverrides({});
  }

  const { data: talliesBySubmissionId, error: talliesError, loading: talliesLoading, hasLoaded: hasTallies, refresh: refreshTallies } =
    useCastingClientResource(projectId, listRoleIds, EMPTY_TALLIES, loadClientTallies);

  function setRoleFilterValue(next: string) {
    const query = new URLSearchParams(searchParams.toString());
    query.set("role", next);
    window.history.replaceState(null, "", `${window.location.pathname}?${query}${window.location.hash}`);
  }

  function runMutation(action: () => Promise<void>, rollback?: () => void) {
    if (mutationBusy.current || !canReviewCasting) return;
    mutationBusy.current = true;
    startTransition(async () => {
      try {
        await action();
      } catch (error) {
        rollback?.();
        showToast({ message: error instanceof Error ? error.message : "Could not save. Check your connection and retry.", variant: "error" });
      } finally {
        mutationBusy.current = false;
        // A multi-role finalization may partially succeed. Always reload authoritative locks/statuses.
        router.refresh();
      }
    });
  }

  function rollbackStatus(candidateId: string) {
    setStatusOverrides((current) => {
      const next = { ...current };
      delete next[candidateId];
      return next;
    });
  }

  function applyStatusOverride(candidateId: string, status: CastingCandidateStatus) {
    setStatusOverrides((current) => ({ ...current, [candidateId]: status }));
  }

  function toggleFinalSelect(candidate: CastingCandidate, checked: boolean) {
    if (!canReviewCasting || mutationBusy.current || isRoleFinalized(roleForCandidate(candidate, roles))) return;
    const nextStatus: CastingCandidateStatus = checked ? "selected" : "shortlisted";
    if (checked ? !(candidate.status === "shortlisted" || candidate.status === "callback") : !TOGGLEABLE_FINAL_SELECT.includes(candidate.status)) return;
    applyStatusOverride(candidate.id, nextStatus);
    runMutation(async () => {
      const result = await updateCastingCandidateStatus({ projectId, candidateId: candidate.id, status: nextStatus, notifyTalent: false });
      if (!result.ok) throw new Error(result.error ?? "Could not update this selection.");
    }, () => rollbackStatus(candidate.id));
  }

  function requestAvailability(candidate: CastingCandidate) {
    if (!canReviewCasting || mutationBusy.current || isRoleFinalized(roleForCandidate(candidate, roles))) return;
    if (!requirePro("talent_outreach")) return;
    applyStatusOverride(candidate.id, "availability_requested");
    runMutation(async () => {
      const result = await updateCastingCandidateStatus({ projectId, candidateId: candidate.id, status: "availability_requested", notifyTalent: true });
      if (!result.ok) throw new Error(result.error ?? "Could not request availability.");
      showToast({ message: "Availability requested", variant: "success" });
    }, () => rollbackStatus(candidate.id));
  }

  function handleCreateJob() {
    runMutation(async () => {
      const result = await createJobFromCasting(projectId);
      if (!result.ok) throw new Error(result.error ?? "Could not create job.");
      showToast({ message: "Job created", variant: "success" });
      setCreateJobOpen(false);
      if (result.jobId) router.push(`/jobs/${result.jobId}`);
      else if (result.jobProjectId) router.push(`/jobs/${result.jobProjectId}`);
    });
  }

  function handleReopenSelections() {
    runMutation(async () => {
      for (const role of scopedRoles.filter((item) => item.bridgedRoleId && isRoleFinalized(item))) {
        const result = await reopenFinalizedCastingRole({ projectId, bridgedRoleId: role.bridgedRoleId! });
        if (!result.ok) throw new Error(result.error ?? "Could not reopen this role.");
      }
      showToast({ message: "Selections reopened. Existing final picks and coordination records are preserved.", variant: "success" });
    });
  }

  function handleFinalizeCasting() {
    if (selectionsLocked) {
      showToast({ message: "Casting is already finalized for this role", variant: "error" });
      return;
    }

    const rolesToFinalize =
      roleFilter === "all"
        ? roles.filter((role) => {
            if (!role.bridgedRoleId || isRoleFinalized(role)) return false;
            return candidatesForRole(candidatesWithOverrides, role).some(isFinalSelectCandidate);
          })
        : selectedRole?.bridgedRoleId && !isRoleFinalized(selectedRole)
          ? [selectedRole]
          : [];

    if (!rolesToFinalize.length) {
      showToast({ message: "No roles ready to finalize", variant: "error" });
      return;
    }

    runMutation(async () => {
      let total = 0;
      let completedRoles = 0;
      for (const role of rolesToFinalize) {
        const bridgedRoleId = role.bridgedRoleId;
        if (!bridgedRoleId) continue;
        const result = await finalizeCastingRole({ projectId, bridgedRoleId });
        if (!result.ok) {
          throw new Error(`${completedRoles ? `${completedRoles} role(s) finalized. ` : ""}${result.error ?? `Could not finalize ${role.name}`}`);
        }
        total += result.finalizedCount ?? 0;
        completedRoles += 1;
      }
      showToast({ message: `Casting finalized. ${total} selected; project people updated.`, variant: "success" });
      setFinalizeOpen(false);
    });
  }


  const confirmedCount = candidatesWithOverrides.filter((c) => c.status === "confirmed").length;
  const canFinalize = canReviewCasting && finalSelectCandidates.length > 0 && !selectionsLocked;

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
        {roles.map((role) => (
          <option key={role.id} value={role.bridgedRoleId ?? role.id}>
            {role.name}
          </option>
        ))}
      </select>
    </label>
  );

  if (!roles.length) {
    return (
      <>
        <CastingPanelHeader title={header.title} />
        <div className="project-workspace__panel-body">
          <EmptyState
            variant="dashboard"
            title="No roles to cast"
            description="Add roles in Breakdown before building your Final Selects."
            actionLabel="Add role"
            actionHref={castingWorkspaceHref(projectId, "breakdown", { hash: "roles" })}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <CastingPanelHeader
        title={header.title}
        center={roleToggle}
        overflowActions={
          <>
          <button type="button" className="bd-btn-secondary text-sm" disabled={talliesLoading} onClick={refreshTallies}>{talliesLoading ? "Loading votes…" : "Refresh votes"}</button>
          {canReviewCasting && confirmedCount > 0 ? (
            <button
              type="button"
              className="bd-btn-secondary text-sm"
              disabled={isPending}
              onClick={() => setCreateJobOpen(true)}
            >
              Create job
            </button>
          ) : null}
          </>
        }
      />

      <div className="project-workspace__panel-body casting-cast">
        {talliesError ? (
          <div role="alert" className="mb-4 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-3 text-sm text-[var(--ui-text)]">
            <p>{talliesError}{hasTallies ? " Previously loaded votes are still shown." : " Client votes are unavailable."}</p>
            <button type="button" className="bd-btn-secondary mt-2" disabled={talliesLoading} onClick={refreshTallies}>Retry votes</button>
          </div>
        ) : null}
        <div className="casting-review__layout casting-client-review__layout">
          <div className="casting-review__main casting-client-review__main">
            {poolCandidates.length === 0 ? (
              <EmptyState
                variant="dashboard"
                title="No shortlisted talent yet"
                description="Shortlist candidates in Review, share for client votes in Client Review, then pick Final Selects here."
                actionLabel="Review candidates"
                actionHref={castingWorkspaceHref(projectId, "review", { stage: "shortlisted" })}
              />
            ) : (
              <div className="casting-table-wrap casting-client-review__table-wrap">
                <table className="casting-table">
                  <thead>
                    <tr>
                      <th scope="col">Talent</th>
                      {roleFilter === "all" ? <th scope="col">Role</th> : null}
                      <th scope="col">Client votes</th>
                      <th scope="col">Final select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poolCandidates.map((candidate) => {
                      const matchedRole =
                        roleFilter === "all"
                          ? roleForCandidate(candidate, roles)
                          : selectedRole;
                      const checked = isFinalSelectCandidate(candidate);
                      const roleFinalized = isRoleFinalized(matchedRole);
                      const canToggle =
                        canReviewCasting && !roleFinalized &&
                        (candidate.status === "shortlisted" ||
                          candidate.status === "callback" ||
                          TOGGLEABLE_FINAL_SELECT.includes(candidate.status));
                      const tally = candidate.submissionId
                        ? talliesBySubmissionId[candidate.submissionId]
                        : undefined;

                      return (
                        <tr key={candidate.id}>
                          <td>
                            <div className="flex items-center gap-3">
                              {candidate.headshotUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={candidate.headshotUrl}
                                  alt=""
                                  className="size-8 rounded-full object-cover"
                                />
                              ) : (
                                <span className="flex size-8 items-center justify-center rounded-full bg-[var(--tone)] text-xs font-semibold">
                                  {candidate.displayName[0]?.toUpperCase() ?? "?"}
                                </span>
                              )}
                              <span>{candidate.displayName}</span>
                            </div>
                          </td>
                          {roleFilter === "all" ? <td>{matchedRole?.name ?? "—"}</td> : null}
                          <td>{!hasTallies ? (talliesError ? "Unavailable" : "Loading…") : voteLabel(tally)}</td>
                          <td>
                            <label className="casting-client-review__select-check">
                              <span className="sr-only">Final select {candidate.displayName}</span>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={isPending || !canToggle}
                                onChange={(event) =>
                                  toggleFinalSelect(candidate, event.target.checked)
                                }
                              />
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <CastingFinalSelectsRail
            projectId={projectId}
            candidates={finalSelectCandidates}
            roles={roles}
            castingTitle={castingTitle}
            isPending={isPending}
            onRequestAvailability={requestAvailability}
            onFinalize={() => setFinalizeOpen(true)}
            onReopen={handleReopenSelections}
            canFinalize={canFinalize}
            selectionsLocked={selectionsLocked}
            canEdit={canReviewCasting}
          />
        </div>
      </div>

      <Modal
        open={createJobOpen}
        onClose={() => { if (!mutationBusy.current) setCreateJobOpen(false); }}
        title="Create job from casting"
        size="md"
      >
        <p className="text-sm text-[var(--ui-muted)] mb-4">
          Creates a new Job project with confirmed talent, roles, and dates. Private evaluations and
          rejected candidates are not transferred.
        </p>
        <button
          type="button"
          className="bd-btn-accent"
          onClick={handleCreateJob}
          disabled={isPending}
        >
          Create job
        </button>
      </Modal>

      <Modal
        open={finalizeOpen}
        onClose={() => { if (!mutationBusy.current) setFinalizeOpen(false); }}
        title={
          roleFilter === "all" && !selectedRole
            ? "Finalize casting"
            : `Finalize ${selectedRole?.name ?? "casting"}`
        }
        size="md"
      >
        <p className="text-sm text-[var(--ui-muted)] mb-4">
          This will finalize casting
          {roleFilter === "all" ? " for roles with Final Selects" : " for this role"}.
          Only the checked final selections are included. Selected Motiion talent will be added to
          project people, and submissions will close. Shortlisted people are not selected automatically.
        </p>
        <button
          type="button"
          className="bd-btn-accent"
          onClick={handleFinalizeCasting}
          disabled={isPending || !canFinalize}
        >
          Finalize casting
        </button>
      </Modal>
    </>
  );
}
