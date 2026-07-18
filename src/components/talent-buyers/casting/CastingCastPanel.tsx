"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  closeCastingFromWorkflow,
  createJobFromCasting,
  finalizeCastingRole,
  reopenCastingFromWorkflow,
  updateCastingCandidateStatus,
} from "@/app/(buyer-app)/(paid)/projects/[id]/casting-workflow/actions";
import {
  getCastingPanelHeader,
  getCastingPrimaryAction,
  deriveCastingWorkflowState,
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
import { useProjectWorkspace } from "@/components/talent-buyers/project/ProjectWorkspaceContext";

import { CastingFinalSelectsRail } from "./CastingFinalSelectsRail";
import { CastingPanelHeader } from "./CastingPanelHeader";

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

function replaceCastQuery(role: string) {
  const next = new URLSearchParams();
  next.set("role", role);
  const query = next.toString();
  window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
}

export function CastingCastPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { projectId, castingWorkflow } = useProjectWorkspace();
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [roleFilter, setRoleFilter] = useState(searchParams.get("role") ?? "all");
  const [statusOverrides, setStatusOverrides] = useState<Record<string, CastingCandidateStatus>>({});
  const [talliesBySubmissionId, setTalliesBySubmissionId] = useState<
    Record<string, ShortlistVoteTally>
  >({});

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
  const header = getCastingPanelHeader("cast");
  const castingTitle = workflow.primaryCasting?.title?.trim() || "Casting";
  const castingStatus = workflow.primaryCasting?.status ?? "none";
  const workflowState = deriveCastingWorkflowState(workflow);
  const closeReopenAction = getCastingPrimaryAction("cast", workflowState);

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

  const selectionsLocked = useMemo(() => {
    if (!scopedRoles.length) return false;
    return scopedRoles.every((role) => !role.bridgedRoleId || isRoleFinalized(role));
  }, [scopedRoles]);

  const listRoleIds = useMemo(
    () =>
      roleFilter === "all"
        ? roles.map((role) => role.bridgedRoleId ?? role.id).filter(Boolean)
        : selectedRole
          ? [selectedRole.bridgedRoleId ?? selectedRole.id].filter(Boolean)
          : [],
    [roleFilter, roles, selectedRole],
  );

  useEffect(() => {
    setStatusOverrides({});
  }, [workflow.candidates]);

  useEffect(() => {
    if (!listRoleIds.length) {
      setTalliesBySubmissionId({});
      return;
    }
    let cancelled = false;

    async function loadTallies() {
      const result = await fetchShortlistVoteTalliesForRoles(listRoleIds);
      if (!cancelled) {
        setTalliesBySubmissionId(result.talliesBySubmissionId);
      }
    }

    void loadTallies();
    return () => {
      cancelled = true;
    };
  }, [listRoleIds.join("|")]);

  function setRoleFilterValue(next: string) {
    setRoleFilter(next);
    replaceCastQuery(next);
  }

  function applyStatusOverride(candidateId: string, status: CastingCandidateStatus) {
    setStatusOverrides((current) => ({ ...current, [candidateId]: status }));
  }

  function toggleFinalSelect(candidate: CastingCandidate, checked: boolean) {
    const matchedRole = roleForCandidate(candidate, roles);
    if (isRoleFinalized(matchedRole)) return;

    const nextStatus: CastingCandidateStatus = checked ? "selected" : "shortlisted";
    if (checked) {
      if (!(candidate.status === "shortlisted" || candidate.status === "callback")) return;
    } else if (!TOGGLEABLE_FINAL_SELECT.includes(candidate.status)) {
      return;
    }

    applyStatusOverride(candidate.id, nextStatus);
    startTransition(async () => {
      const result = await updateCastingCandidateStatus({
        projectId,
        candidateId: candidate.id,
        status: nextStatus,
        notifyTalent: false,
      });
      if (!result.ok) {
        setStatusOverrides((current) => {
          const next = { ...current };
          delete next[candidate.id];
          return next;
        });
        showToast({ message: result.error ?? "Update failed", variant: "error" });
        return;
      }
      router.refresh();
    });
  }

  function requestAvailability(candidate: CastingCandidate) {
    if (isRoleFinalized(roleForCandidate(candidate, roles))) return;
    applyStatusOverride(candidate.id, "availability_requested");
    startTransition(async () => {
      const result = await updateCastingCandidateStatus({
        projectId,
        candidateId: candidate.id,
        status: "availability_requested",
        notifyTalent: true,
      });
      if (!result.ok) {
        setStatusOverrides((current) => {
          const next = { ...current };
          delete next[candidate.id];
          return next;
        });
        showToast({ message: result.error ?? "Update failed", variant: "error" });
        return;
      }
      showToast({ message: "Availability requested", variant: "success" });
      router.refresh();
    });
  }

  function handleCreateJob() {
    startTransition(async () => {
      const result = await createJobFromCasting(projectId);
      if (!result.ok) {
        showToast({ message: result.error ?? "Could not create job", variant: "error" });
        return;
      }
      showToast({ message: "Job project created", variant: "success" });
      setCreateJobOpen(false);
      if (result.jobProjectId) router.push(`/projects/${result.jobProjectId}/overview`);
    });
  }

  function handleCloseOrReopen() {
    startTransition(async () => {
      if (castingStatus === "closed") {
        const result = await reopenCastingFromWorkflow(projectId);
        if (!result.ok) {
          showToast({ message: result.error ?? "Could not re-open casting", variant: "error" });
          return;
        }
        showToast({ message: "Casting re-opened", variant: "success" });
        router.refresh();
        return;
      }

      const result = await closeCastingFromWorkflow(projectId);
      if (!result.ok) {
        showToast({ message: result.error ?? "Could not close casting", variant: "error" });
        return;
      }
      showToast({
        message: "Casting closed. It is removed from open castings and submissions are disabled.",
        variant: "success",
      });
      router.refresh();
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

    startTransition(async () => {
      let total = 0;
      for (const role of rolesToFinalize) {
        const bridgedRoleId = role.bridgedRoleId;
        if (!bridgedRoleId) continue;
        const result = await finalizeCastingRole({ projectId, bridgedRoleId });
        if (!result.ok) {
          showToast({
            message: result.error ?? `Could not finalize ${role.name}`,
            variant: "error",
          });
          return;
        }
        total += result.finalizedCount ?? 0;
      }
      showToast({
        message: `Casting finalized. ${total} selected; other submitters will be notified.`,
        variant: "success",
      });
      setFinalizeOpen(false);
      router.refresh();
    });
  }

  function handlePrimaryAction(actionId: string) {
    if (actionId === "close-casting" || actionId === "reopen-casting") {
      handleCloseOrReopen();
      return;
    }
    if (actionId === "create-job") {
      setCreateJobOpen(true);
    }
  }

  const confirmedCount = candidatesWithOverrides.filter((c) => c.status === "confirmed").length;
  const canFinalize = finalSelectCandidates.length > 0 && !selectionsLocked;

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
        primaryAction={closeReopenAction}
        onPrimaryAction={handlePrimaryAction}
        overflowActions={
          confirmedCount > 0 ? (
            <button
              type="button"
              className="bd-btn-secondary text-sm"
              disabled={isPending}
              onClick={() => setCreateJobOpen(true)}
            >
              Create job
            </button>
          ) : null
        }
      />

      <div className="project-workspace__panel-body casting-cast">
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
                        !roleFinalized &&
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
                          <td>{voteLabel(tally)}</td>
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
            candidates={finalSelectCandidates}
            roles={roles}
            castingTitle={castingTitle}
            isPending={isPending}
            onRequestAvailability={requestAvailability}
            onFinalize={() => setFinalizeOpen(true)}
            canFinalize={canFinalize}
            selectionsLocked={selectionsLocked}
          />
        </div>
      </div>

      <Modal
        open={createJobOpen}
        onClose={() => setCreateJobOpen(false)}
        title="Create job from casting"
        size="md"
      >
        <p className="text-sm text-white/60 mb-4">
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
        onClose={() => setFinalizeOpen(false)}
        title={
          roleFilter === "all" && !selectedRole
            ? "Finalize casting"
            : `Finalize ${selectedRole?.name ?? "casting"}`
        }
        size="md"
      >
        <p className="text-sm text-white/60 mb-4">
          This will finalize casting
          {roleFilter === "all" ? " for roles with Final Selects" : " for this role"} and notify all
          submitters of the outcome. Selected and shortlisted talent with submissions will be marked
          as selected; any unreviewed submissions will automatically be rejected.
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
