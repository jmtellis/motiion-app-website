"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Copy } from "lucide-react";

import { getCastingPanelHeader } from "@/lib/talent-buyers/casting/casting-navigation";
import { roleMatchIds } from "@/lib/talent-buyers/casting/casting-filters";
import { castingWorkspaceHref } from "@/lib/talent-buyers/casting/casting-routes";
import type { CastingCandidate, CastingRole } from "@/lib/talent-buyers/casting/casting-types";
import {
  listShortlistSharesForRoles,
  fetchClientFeedbackForRoles,
  deactivateShortlistShare,
  type ShortlistLinkDuration,
  type ShortlistShareSummary,
} from "@/lib/talent-buyers/shortlist-shares";

import type { ClientReviewFeedback } from "@/lib/talent-buyers/casting/client-feedback";

import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { EmptyState } from "@/components/talent-buyers/dashboard/EmptyState";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { useProjectWorkspace } from "@/components/talent-buyers/project/ProjectWorkspaceContext";

import { CastingPanelHeader } from "./CastingPanelHeader";
import { useCastingClientResource } from "./useCastingClientResource";
import { CastingShortlistShareModal, SHORTLIST_SHARE_DURATIONS } from "./CastingShortlistShareModal";

import "./casting-workspace.css";

function isShortlistedCandidate(candidate: CastingCandidate) {
  return candidate.status === "shortlisted" || candidate.status === "callback";
}

function shortlistedForRole(candidates: CastingCandidate[], role: CastingRole): CastingCandidate[] {
  const ids = roleMatchIds(role);
  return candidates.filter(
    (candidate) =>
      isShortlistedCandidate(candidate) &&
      candidate.roleIds.some((roleId) => ids.includes(roleId)),
  );
}

function shareDurationLabel(expirationKind: string | null): string {
  const match = SHORTLIST_SHARE_DURATIONS.find(
    (option) => option.value === (expirationKind as ShortlistLinkDuration),
  );
  return match?.label ?? expirationKind?.replaceAll("_", " ") ?? "—";
}

const EMPTY_SHARES: ShortlistShareSummary[] = [];
const EMPTY_FEEDBACK: ClientReviewFeedback[] = [];
async function loadClientFeedback(roleIds: string[]) {
  const result = await fetchClientFeedbackForRoles(roleIds);
  return { data: result.feedback, error: result.error };
}
async function loadClientShares(roleIds: string[]) {
  const result = await listShortlistSharesForRoles(roleIds);
  return { data: result.shares, error: result.error };
}

export function CastingClientReviewPanel() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { projectId, project, castingWorkflow } = useProjectWorkspace();
  const canReviewCasting = project.canReviewCasting !== false;
  const [shareOpen, setShareOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ShortlistShareSummary | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const revokeBusy = useRef(false);
  const [reviewerFilter, setReviewerFilter] = useState("all");
  const requestedRole = searchParams.get("role") ?? "all";

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
  const header = getCastingPanelHeader("client-review");

  const selectedRole =
    roleFilter === "all"
      ? null
      : (roles.find((role) => role.id === roleFilter || role.bridgedRoleId === roleFilter) ?? null);

  const shareRoleIds = useMemo(() => {
    if (roleFilter === "all") {
      return roles
        .filter((role) => shortlistedForRole(workflow.candidates, role).length > 0)
        .map((role) => role.bridgedRoleId ?? role.id)
        .filter(Boolean);
    }
    if (!selectedRole) return [];
    if (!shortlistedForRole(workflow.candidates, selectedRole).length) return [];
    return [selectedRole.bridgedRoleId ?? selectedRole.id].filter(Boolean);
  }, [roleFilter, roles, selectedRole, workflow.candidates]);

  const shareScopeLabel =
    roleFilter === "all" ? "all roles" : (selectedRole?.name ?? "the selected role");
  const shareTitle =
    roleFilter === "all"
      ? workflow.primaryCasting?.title?.trim() || "All roles"
      : (selectedRole?.name ?? "Shortlist");

  const listRoleIds = useMemo(
    () =>
      roleFilter === "all"
        ? roles.map((role) => role.bridgedRoleId ?? role.id).filter(Boolean)
        : shareRoleIds.length
          ? shareRoleIds
          : selectedRole
            ? [selectedRole.bridgedRoleId ?? selectedRole.id].filter(Boolean)
            : [],
    [roleFilter, roles, shareRoleIds, selectedRole],
  );

  const { data: shares, error: sharesError, loading: sharesLoading, hasLoaded, refresh } =
    useCastingClientResource(projectId, listRoleIds, EMPTY_SHARES, loadClientShares);

  const { data: feedback, error: feedbackError, loading: feedbackLoading, hasLoaded: hasFeedback, refresh: refreshFeedback } =
    useCastingClientResource(projectId, listRoleIds, EMPTY_FEEDBACK, loadClientFeedback);
  const activeReviewer = feedback.some((review) => review.reviewerId === reviewerFilter) ? reviewerFilter : "all";
  const visibleFeedback = activeReviewer === "all" ? feedback : feedback.filter((review) => review.reviewerId === activeReviewer);

  const shareRows = useMemo(() => {
    return shares.map((share) => {
      const ids = share.roleIds.length ? share.roleIds : [share.roleId];
      const matchedRoles = roles.filter((role) => {
        const roleIds = roleMatchIds(role);
        return ids.some((id) => roleIds.includes(id) || role.id === id || role.bridgedRoleId === id);
      });
      const peopleCount = new Set(
        workflow.candidates
          .filter(isShortlistedCandidate)
          .filter((candidate) =>
            matchedRoles.some((role) =>
              candidate.roleIds.some((id) => roleMatchIds(role).includes(id)),
            ),
          )
          .map((candidate) => candidate.id),
      ).size;

      return {
        share,
        roleLabel:
          matchedRoles.length > 1
            ? "All roles"
            : (matchedRoles[0]?.name ?? share.title ?? "Role"),
        peopleCount,
        durationLabel: shareDurationLabel(share.expirationKind),
      };
    });
  }, [roles, shares, workflow.candidates]);

  function setRoleFilterValue(next: string) {
    const query = new URLSearchParams(searchParams.toString());
    query.set("role", next);
    window.history.replaceState(null, "", `${window.location.pathname}?${query}${window.location.hash}`);
  }

  async function copyShareUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      showToast({ message: "Link copied", variant: "success" });
    } catch {
      showToast({ message: "Could not copy link", variant: "error" });
    }
  }

  async function revokeLink() {
    if (!canReviewCasting || !revokeTarget || revokeBusy.current) return;
    revokeBusy.current = true;
    setRevoking(true);
    setRevokeError(null);
    try {
      const result = await deactivateShortlistShare(revokeTarget.id);
      if (!result.ok) throw new Error(result.error ?? "Could not revoke link.");
      setRevokeTarget(null);
      refresh();
      showToast({ message: "Review link revoked. Submitted feedback is retained.", variant: "success" });
    } catch (failure) {
      setRevokeError(failure instanceof Error ? failure.message : "Could not revoke link. Check your connection and retry.");
    } finally {
      revokeBusy.current = false;
      setRevoking(false);
    }
  }

  const primaryAction = {
    label: "Create client link",
    actionId: "create-client-link",
    disabled: shareRoleIds.length === 0,
  };

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
            title="No roles to present"
            description="Add roles in Breakdown before creating a client review link."
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
        primaryAction={canReviewCasting ? primaryAction : undefined}
        onPrimaryAction={(actionId) => {
          if (actionId === "create-client-link") setShareOpen(true);
        }}
      />

      <div className="project-workspace__panel-body casting-client-review casting-client-review--share">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--ui-muted)]" role="status">
            {sharesLoading ? (hasLoaded ? "Refreshing client links…" : "Loading active links…") : "Active client links"}
          </p>
          <button type="button" className="bd-btn-secondary text-sm" disabled={sharesLoading} onClick={refresh}>Refresh</button>
        </div>
        {sharesError ? (
          <div role="alert" className="mb-4 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-3 text-sm text-[var(--ui-text)]">
            <p>{sharesError}{hasLoaded ? " Previously loaded links are still shown." : ""}</p>
            <button type="button" className="bd-btn-secondary mt-2" disabled={sharesLoading} onClick={refresh}>Try again</button>
          </div>
        ) : null}
        {!hasLoaded ? null : shareRows.length === 0 ? (
          <EmptyState
            variant="dashboard"
            title="No active client links"
            description={
              shareRoleIds.length
                ? `Use Create client link to share shortlisted talent for ${shareScopeLabel}.`
                : "Shortlist talent in Review first, then create a presentation link here."
            }
            actionLabel={shareRoleIds.length ? undefined : "Review candidates"}
            actionHref={
              shareRoleIds.length
                ? undefined
                : castingWorkspaceHref(projectId, "review", { stage: "shortlisted" })
            }
          />
        ) : (
          <div className="casting-table-wrap">
            <table className="casting-table">
              <thead>
                <tr>
                  <th scope="col">Role</th>
                  <th scope="col">People</th>
                  <th scope="col">Duration</th>
                  <th scope="col">Review link</th>
                </tr>
              </thead>
              <tbody>
                {shareRows.map(({ share, roleLabel, peopleCount, durationLabel }) => (
                  <tr key={share.id}>
                    <td>{roleLabel}</td>
                    <td>
                      {peopleCount} {peopleCount === 1 ? "person" : "people"}
                    </td>
                    <td>{durationLabel}{share.expiresAt ? <time dateTime={share.expiresAt} className="block text-xs text-[var(--ui-muted)]">Expires {new Date(share.expiresAt).toLocaleString()}</time> : null}</td>
                    <td>
                      <div className="casting-client-review__link-cell">
                        <a
                          href={share.publicUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="casting-client-review__link-url"
                          title={share.publicUrl}
                        >
                          {share.publicUrl.replace(/^https?:\/\//, "")}
                        </a>
                        <button
                          type="button"
                          className="casting-client-review__copy-btn"
                          onClick={() => void copyShareUrl(share.publicUrl)}
                          aria-label="Copy review link"
                          title="Copy link"
                        >
                          <Copy className="size-3.5" aria-hidden />
                        </button>
                        {canReviewCasting ? <button type="button" className="bd-btn-secondary text-sm" onClick={() => { setRevokeError(null); setRevokeTarget(share); }}>Revoke</button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <section className="mt-8 border-t border-[var(--ui-border)] pt-5" aria-labelledby="casting-client-feedback-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 id="casting-client-feedback-heading" className="font-semibold text-[var(--ui-text)]">Client feedback</h3>
              <p className="mt-1 text-sm text-[var(--ui-muted)]">Submitted decisions remain available after a review link expires or is revoked.</p>
            </div>
            <button type="button" className="bd-btn-secondary text-sm" disabled={feedbackLoading} onClick={refreshFeedback}>
              {feedbackLoading ? "Loading feedback…" : "Refresh feedback"}
            </button>
          </div>
          {feedbackError ? <div role="alert" className="mt-3 text-sm text-[var(--ui-danger)]">
            {feedbackError}{hasFeedback ? " Previously loaded feedback is still shown." : ""}
            <button type="button" className="bd-btn-secondary ml-2" disabled={feedbackLoading} onClick={refreshFeedback}>Try again</button>
          </div> : null}
          {hasFeedback && feedback.length === 0 ? <p className="mt-4 text-sm text-[var(--ui-muted)]">No client decisions submitted for these roles yet.</p> : null}
          {feedback.length > 1 ? <label className="mt-4 flex items-center gap-2 text-sm text-[var(--ui-text)]">
            Reviewer
            <select className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 py-2" value={activeReviewer} onChange={(event) => setReviewerFilter(event.target.value)}>
              <option value="all">All reviewers</option>
              {feedback.map((review) => <option key={review.reviewerId} value={review.reviewerId}>{review.reviewerName}</option>)}
            </select>
          </label> : null}
          <div className="mt-4 space-y-3">
            {visibleFeedback.map((review) => {
              const selected = review.choices.filter((choice) => choice.selected).length;
              return <details key={review.reviewerId} className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
                <summary className="cursor-pointer text-sm text-[var(--ui-text)]">
                  <strong>{review.reviewerName}</strong> · {selected} selected · {review.choices.length - selected} passed
                  <time dateTime={review.submittedAt} className="ml-2 text-xs text-[var(--ui-muted)]">{new Date(review.submittedAt).toLocaleString()}</time>
                </summary>
                <ul className="mt-3 divide-y divide-[var(--ui-border)]">
                  {review.choices.map((choice) => {
                    const role = roles.find((item) => roleMatchIds(item).includes(choice.roleId));
                    const candidate = workflow.candidates.find((item) => item.submissionId === choice.submissionId);
                    return <li key={choice.submissionId} className="flex items-start justify-between gap-3 py-3 text-sm">
                      <div><p className="font-medium text-[var(--ui-text)]">{candidate?.displayName || choice.name}</p><p className="text-xs text-[var(--ui-muted)]">{role?.name ?? "Role"}</p></div>
                      <span className={choice.selected ? "text-[var(--ui-success)]" : "text-[var(--ui-muted)]"}>{choice.selected ? "Selected" : "Passed"}</span>
                    </li>;
                  })}
                </ul>
              </details>;
            })}
          </div>
        </section>
      </div>

      <Modal open={Boolean(revokeTarget)} onClose={() => { if (!revokeBusy.current) setRevokeTarget(null); }} title="Revoke client review link?" size="sm"
        footer={<button type="button" className="ui-button ui-button--danger" disabled={revoking} onClick={() => void revokeLink()}>{revoking ? "Revoking…" : "Revoke link"}</button>}>
        <p className="text-sm text-[var(--ui-muted)]">Anyone with this link will lose access. Submitted client feedback remains available here. You can create a new link later.</p>
        {revokeError ? <p role="alert" className="mt-3 text-sm text-[var(--ui-danger)]">{revokeError}</p> : null}
      </Modal>

      <CastingShortlistShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        roleIds={shareRoleIds}
        title={shareTitle}
        scopeLabel={shareScopeLabel}
        onShareCreated={refresh}
      />
    </>
  );
}
