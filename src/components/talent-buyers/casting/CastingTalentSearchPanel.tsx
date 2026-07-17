"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { X } from "lucide-react";

import { fetchNavigatorTalent } from "@/app/(buyer-app)/talent/actions";
import {
  getCastingReferralShareUrls,
  inviteCandidatesFromSearch,
  withdrawInvitationFromSearch,
} from "@/app/(buyer-app)/projects/[id]/casting-workflow/actions";
import { getProfileInitials } from "@/lib/auth/avatar";
import {
  deriveCastingWorkflowState,
  getCastingPanelHeader,
  getCastingPrimaryAction,
} from "@/lib/talent-buyers/casting/casting-navigation";
import {
  castingConfigurationLocalHireOnly,
  invitationMatchesRole,
  invitationTalentKeys,
  mapCastingRoleToMatchFilters,
  referralMatchesRole,
} from "@/lib/talent-buyers/casting/casting-filters";
import { referralToTalent } from "@/lib/talent-buyers/casting/casting-referrals";
import type { CastingInvitation, CastingRole } from "@/lib/talent-buyers/casting/casting-types";
import type { Talent } from "@/lib/talent-navigator/types";

import { EmptyState } from "@/components/talent-buyers/dashboard/EmptyState";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { useProjectWorkspace } from "@/components/talent-buyers/project/ProjectWorkspaceContext";
import { ActiveTalentPanel } from "@/components/talent-buyers/talent-navigator/ActiveTalentPanel";

import { AskForReferralModal } from "./AskForReferralModal";
import { CastingPanelHeader } from "./CastingPanelHeader";
import { CastingTalentCarousel, PROFILE_DRAG_MIME } from "./CastingTalentCarousel";
import { FindTalentReferralMenu } from "./FindTalentReferralMenu";

import "@/components/talent-buyers/talent-navigator/talent-navigator.css";

function buildRoleQuery(roleId: string) {
  return roleId ? `?role=${encodeURIComponent(roleId)}` : "";
}

function inviteAvatarUrl(invite: CastingInvitation) {
  if (invite.headshotUrl?.trim()) return invite.headshotUrl.trim();
  const name = invite.talentName || "Talent";
  const initials = getProfileInitials(name);
  const hue =
    Math.abs(name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:hsl(${hue},35%,28%)"/><stop offset="100%" style="stop-color:hsl(${hue},45%,18%)"/></linearGradient></defs><rect width="80" height="80" fill="url(#g)"/><text x="40" y="46" text-anchor="middle" font-family="system-ui,sans-serif" font-size="28" font-weight="600" fill="rgba(255,255,255,0.45)">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function CastingTalentSearchPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { projectId, castingWorkflow } = useProjectWorkspace();
  const [matchedTalent, setMatchedTalent] = useState<Talent[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [askReferralOpen, setAskReferralOpen] = useState(false);
  const [, startTransition] = useTransition();

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
  const selectedRoleId = searchParams.get("role") ?? roles[0]?.id ?? "";
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0] ?? null;

  const state = deriveCastingWorkflowState(workflow);
  const header = getCastingPanelHeader("talent-search");

  const primaryAction = {
    ...getCastingPrimaryAction("talent-search", state),
    disabled: !selectedRole?.id,
  };

  const roleInvitations = useMemo(
    () =>
      workflow.invitations.filter(
        (invite) => invite.status !== "withdrawn" && invitationMatchesRole(invite, selectedRole),
      ),
    [selectedRole, workflow.invitations],
  );

  const roleInvitedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const invite of roleInvitations) {
      for (const key of invitationTalentKeys(invite)) {
        keys.add(key);
      }
    }
    return keys;
  }, [roleInvitations]);

  const referredTalent = useMemo(() => {
    return workflow.referrals
      .filter((referral) => referralMatchesRole(referral, selectedRole))
      .map((referral) => {
        const candidate = workflow.candidates.find(
          (item) =>
            item.talentProfileId === referral.referredProfileId ||
            (referral.talentUserId && item.talentUserId === referral.talentUserId),
        );
        return referralToTalent({
          ...referral,
          talentName: candidate?.displayName?.trim() || referral.talentName,
          headshotUrl: candidate?.headshotUrl || referral.headshotUrl,
          talentSlug: candidate?.talentSlug || referral.talentSlug,
          talentUserId: candidate?.talentUserId || referral.talentUserId,
          roleIds: referral.roleIds.length ? referral.roleIds : (candidate?.roleIds ?? []),
        });
      })
      .filter((talent) => !roleInvitedKeys.has(talent.id));
  }, [roleInvitedKeys, selectedRole, workflow.candidates, workflow.referrals]);

  const localHireOnly = castingConfigurationLocalHireOnly(workflow.primaryCasting?.configuration);

  const visibleMatchedTalent = useMemo(() => {
    return matchedTalent.filter((talent) => !roleInvitedKeys.has(talent.id));
  }, [matchedTalent, roleInvitedKeys]);

  const loadMatches = useCallback(
    async (role: CastingRole | null) => {
      if (!role) {
        setMatchedTalent([]);
        return;
      }

      setLoadingMatches(true);
      try {
        const data = await fetchNavigatorTalent(
          mapCastingRoleToMatchFilters(role, { localHireOnly }),
        );
        setMatchedTalent(data.talent);
      } catch {
        showToast({ message: "Could not load matched talent.", variant: "error" });
        setMatchedTalent([]);
      } finally {
        setLoadingMatches(false);
      }
    },
    [localHireOnly, showToast],
  );

  useEffect(() => {
    if (!searchParams.get("role") && roles[0]?.id) {
      router.replace(buildRoleQuery(roles[0].id));
    }
  }, [roles, router, searchParams]);

  useEffect(() => {
    if (searchParams.get("askReferral") === "1" && workflow.primaryCasting?.id) {
      setAskReferralOpen(true);
      const next = new URLSearchParams(searchParams.toString());
      next.delete("askReferral");
      const query = next.toString();
      router.replace(query ? `?${query}` : "?");
    }
  }, [router, searchParams, workflow.primaryCasting?.id]);

  useEffect(() => {
    void loadMatches(selectedRole);
  }, [loadMatches, selectedRole]);

  useEffect(() => {
    if (!detailsOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDetailsOpen(false);
        setSelectedTalent(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [detailsOpen]);

  function setSelectedRole(roleId: string) {
    router.push(buildRoleQuery(roleId));
  }

  async function copyReferralLink(kind: "motiion" | "external") {
    const castingId = workflow.primaryCasting?.id;
    if (!castingId) {
      showToast({ message: "Save the casting before sharing a referral link.", variant: "error" });
      return;
    }
    const result = await getCastingReferralShareUrls(castingId);
    if (!result.ok) {
      showToast({ message: result.error ?? "Could not create referral link.", variant: "error" });
      return;
    }
    const url =
      kind === "external"
        ? result.externalUrl
        : result.motiionUrl;
    if (!url) {
      showToast({ message: "Could not create referral link.", variant: "error" });
      return;
    }
    const absolute = url.startsWith("http")
      ? url
      : `${window.location.origin}${url.startsWith("/") ? url : `/${url}`}`;
    void navigator.clipboard.writeText(absolute).then(
      () =>
        showToast({
          message: kind === "external" ? "External referral link copied" : "Motiion referral link copied",
          variant: "success",
        }),
      () => showToast({ message: "Could not copy link", variant: "error" }),
    );
  }

  function handlePrimaryAction(actionId: string) {
    if (actionId === "search-talent" && selectedRole?.id) {
      router.push(`/talent?roleId=${encodeURIComponent(selectedRole.id)}`);
    }
  }

  function openTalentDetails(talent: Talent) {
    setSelectedTalent(talent);
    setDetailsOpen(true);
  }

  function closeTalentDetails() {
    setDetailsOpen(false);
    setSelectedTalent(null);
  }

  function inviteProfiles(profileIds: string[]) {
    if (!selectedRole || !profileIds.length) return;

    const roleIds = [selectedRole.bridgedRoleId ?? selectedRole.id].filter(Boolean) as string[];

    startTransition(async () => {
      const result = await inviteCandidatesFromSearch({
        projectId,
        profileIds,
        roleIds,
      });
      if (!result.ok) {
        showToast({ message: result.error ?? "Invite failed", variant: "error" });
        return;
      }
      showToast({ message: `Invited ${result.count ?? profileIds.length} dancer(s)`, variant: "success" });
      closeTalentDetails();
      router.refresh();
    });
  }

  function removeInvitation(invite: CastingInvitation) {
    startTransition(async () => {
      const result = await withdrawInvitationFromSearch({
        projectId,
        invitationId: invite.id,
      });
      if (!result.ok) {
        showToast({ message: result.error ?? "Could not remove invitation", variant: "error" });
        return;
      }
      showToast({
        message: "Removed from invited. Invite again to resend.",
        variant: "success",
      });
      router.refresh();
    });
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setDropActive(false);
    const profileId = event.dataTransfer.getData(PROFILE_DRAG_MIME);
    if (!profileId || roleInvitedKeys.has(profileId)) return;
    inviteProfiles([profileId]);
  }

  if (!roles.length) {
    return (
      <>
        <CastingPanelHeader title={header.title} description="" />
        <div className="project-workspace__panel-body">
          <EmptyState
            variant="dashboard"
            title="No roles available for matching"
            description="Add at least one role to search, invite, and source candidates."
            actionLabel="Add role"
            actionHref={`/projects/${projectId}/castings/new`}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <CastingPanelHeader
        title={header.title}
        description=""
        primaryAction={primaryAction}
        onPrimaryAction={handlePrimaryAction}
        center={
          <label className="casting-find-talent-role-pill">
            <span className="sr-only">Role</span>
            <select
              value={selectedRole?.id ?? ""}
              onChange={(event) => setSelectedRole(event.target.value)}
              className="casting-find-talent-role-pill__select"
              disabled={roles.length <= 1}
              aria-label="Role"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
        }
      />

      <div className="project-workspace__panel-body casting-talent-search">
        <div className="casting-talent-search__layout">
          <div className="casting-talent-search__main">
            <div className="casting-find-talent-board">
              <div className="casting-find-talent-board__left">
                <CastingTalentCarousel
                  title="Matched talent"
                  items={visibleMatchedTalent}
                  loading={loadingMatches}
                  selectedId={selectedTalent?.id}
                  onSelect={openTalentDetails}
                  emptyTitle="No matches yet"
                  emptyDescription="Try another role or broaden the role requirements in Breakdown."
                  emptyActionLabel="Edit breakdown"
                  emptyActionHref={`/projects/${projectId}/workspace/breakdown#roles`}
                />

                <div className="casting-find-talent-board__row-divider" role="separator" />

                <CastingTalentCarousel
                  title="Referred talent"
                  items={referredTalent}
                  selectedId={selectedTalent?.id}
                  onSelect={openTalentDetails}
                  emptyTitle="No referrals yet"
                  emptyDescription="Ask someone on Motiion or share a referral link to collect dancer recommendations."
                  emptyActionLabel="Ask for referral"
                  onEmptyAction={
                    workflow.primaryCasting?.id ? () => setAskReferralOpen(true) : undefined
                  }
                  headerActions={
                    <FindTalentReferralMenu
                      disabled={!workflow.primaryCasting?.id}
                      onAskForReferral={() => setAskReferralOpen(true)}
                      onCopyMotiionLink={() => void copyReferralLink("motiion")}
                      onCopyExternalLink={() => void copyReferralLink("external")}
                    />
                  }
                />
              </div>
            </div>
          </div>

          <section
            className={`casting-find-talent-invited-panel${dropActive ? " is-drop-active" : ""}`}
            aria-labelledby="casting-invited-heading"
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
              setDropActive(true);
            }}
            onDragLeave={() => setDropActive(false)}
            onDrop={handleDrop}
          >
            <div className="casting-find-talent-board__section-header">
              <h3 id="casting-invited-heading">Invited ({roleInvitations.length})</h3>
            </div>

            {roleInvitations.length === 0 ? (
              <div className="casting-find-talent-dropzone">
                <p>Drop talent here to invite.</p>
              </div>
            ) : (
              <ul className="casting-find-talent-invite-list">
                {roleInvitations.map((invite) => (
                  <li key={invite.id} className="casting-find-talent-invite-item">
                    <div className="casting-find-talent-invite-item__identity">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={inviteAvatarUrl(invite)}
                        alt=""
                        className="casting-find-talent-invite-item__avatar"
                      />
                      <div className="casting-find-talent-invite-item__main">
                        {invite.talentSlug ? (
                          <Link
                            href={`/talent/${invite.talentSlug}`}
                            className="casting-find-talent-invite-item__name"
                          >
                            {invite.talentName}
                          </Link>
                        ) : (
                          <span className="casting-find-talent-invite-item__name">
                            {invite.talentName}
                          </span>
                        )}
                        <span className="casting-find-talent-invite-item__status">
                          {invite.status.replaceAll("_", " ")}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="casting-find-talent-invite-item__remove"
                      onClick={() => removeInvitation(invite)}
                      aria-label={`Remove ${invite.talentName} from invited`}
                      title="Remove from invited so you can resend"
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {detailsOpen && selectedTalent ? (
            <>
              <button
                type="button"
                className="casting-talent-search__detail-scrim"
                aria-label="Close dancer details"
                onClick={closeTalentDetails}
              />
              <ActiveTalentPanel
                talent={selectedTalent}
                open
                compact
                onClose={closeTalentDetails}
                onInvite={() => inviteProfiles([selectedTalent.id])}
              />
            </>
          ) : null}
        </div>
      </div>

      {workflow.primaryCasting?.id ? (
        <AskForReferralModal
          open={askReferralOpen}
          onClose={() => setAskReferralOpen(false)}
          castingId={workflow.primaryCasting.id}
          castingTitle={workflow.primaryCasting.title}
        />
      ) : null}
    </>
  );
}
