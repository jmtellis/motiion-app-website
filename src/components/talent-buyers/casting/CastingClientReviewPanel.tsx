"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Copy } from "lucide-react";

import { getCastingPanelHeader } from "@/lib/talent-buyers/casting/casting-navigation";
import { roleMatchIds } from "@/lib/talent-buyers/casting/casting-filters";
import { castingWorkspaceHref } from "@/lib/talent-buyers/casting/casting-routes";
import type { CastingCandidate, CastingRole } from "@/lib/talent-buyers/casting/casting-types";
import {
  listShortlistSharesForRoles,
  type ShortlistLinkDuration,
  type ShortlistShareSummary,
} from "@/lib/talent-buyers/shortlist-shares";

import { EmptyState } from "@/components/talent-buyers/dashboard/EmptyState";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { useProjectWorkspace } from "@/components/talent-buyers/project/ProjectWorkspaceContext";

import { CastingPanelHeader } from "./CastingPanelHeader";
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

function replaceClientReviewQuery(role: string) {
  const next = new URLSearchParams();
  next.set("role", role);
  const query = next.toString();
  window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
}

export function CastingClientReviewPanel() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { projectId, castingWorkflow } = useProjectWorkspace();
  const [shareOpen, setShareOpen] = useState(false);
  const [shares, setShares] = useState<ShortlistShareSummary[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);
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

  const roles = workflow.roles;
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

  useEffect(() => {
    if (!listRoleIds.length) {
      setShares([]);
      return;
    }
    let cancelled = false;

    async function loadShares() {
      setSharesLoading(true);
      const result = await listShortlistSharesForRoles(listRoleIds);
      if (!cancelled) {
        setShares(result.shares);
        setSharesLoading(false);
      }
    }

    void loadShares();
    return () => {
      cancelled = true;
    };
  }, [listRoleIds.join("|")]);

  function setRoleFilterValue(next: string) {
    setRoleFilter(next);
    replaceClientReviewQuery(next);
  }

  async function copyShareUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      showToast({ message: "Link copied", variant: "success" });
    } catch {
      showToast({ message: "Could not copy link", variant: "error" });
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
        primaryAction={primaryAction}
        onPrimaryAction={(actionId) => {
          if (actionId === "create-client-link") setShareOpen(true);
        }}
      />

      <div className="project-workspace__panel-body casting-client-review casting-client-review--share">
        {sharesLoading ? (
          <p className="text-sm text-white/50">Loading active links…</p>
        ) : shareRows.length === 0 ? (
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
                    <td>{durationLabel}</td>
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CastingShortlistShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        roleIds={shareRoleIds}
        title={shareTitle}
        scopeLabel={shareScopeLabel}
        onShareCreated={(share) => {
          setShares((current) => [share, ...current.filter((item) => item.id !== share.id)]);
        }}
      />
    </>
  );
}
