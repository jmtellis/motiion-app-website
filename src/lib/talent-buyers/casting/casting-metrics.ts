import type {
  CastingAttentionItem,
  CastingCandidate,
  CastingProgressMetrics,
  CastingProject,
  CastingRole,
} from "./casting-types";
import { castingWorkspaceHref } from "./casting-routes";
import { countCandidatesByStatus, countCandidatesForCastingRole } from "./casting-filters";
import { NEW_SUBMISSION_CANDIDATE_STATUSES } from "./casting-statuses";

export function getCastingProgressMetrics(candidates: CastingCandidate[]): CastingProgressMetrics {
  return {
    invited: countCandidatesByStatus(candidates, ["invited"]),
    submitted: countCandidatesByStatus(candidates, ["submitted"]),
    inReview: countCandidatesByStatus(candidates, ["in_review", "discovered"]),
    shortlisted: countCandidatesByStatus(candidates, ["shortlisted", "callback"]),
    selected: countCandidatesByStatus(candidates, [
      "selected",
      "availability_requested",
      "offer_sent",
      "accepted",
    ]),
    confirmed: countCandidatesByStatus(candidates, ["confirmed"]),
  };
}

export function getCastingProgressMetricsForRole(
  candidates: CastingCandidate[],
  role: CastingRole,
): CastingProgressMetrics {
  return {
    invited: countCandidatesForCastingRole(candidates, role, ["invited"]),
    submitted: countCandidatesForCastingRole(candidates, role, ["submitted"]),
    inReview: countCandidatesForCastingRole(candidates, role, ["in_review", "discovered"]),
    shortlisted: countCandidatesForCastingRole(candidates, role, ["shortlisted", "callback"]),
    selected: countCandidatesForCastingRole(candidates, role, [
      "selected",
      "availability_requested",
      "offer_sent",
      "accepted",
    ]),
    confirmed: countCandidatesForCastingRole(candidates, role, ["confirmed"]),
  };
}

export function enrichRolesWithCounts(
  roles: CastingRole[],
  candidates: CastingCandidate[],
): CastingRole[] {
  return roles.map((role) => ({
    ...role,
    candidateCount: countCandidatesForCastingRole(candidates, role),
    shortlistCount: countCandidatesForCastingRole(candidates, role, ["shortlisted", "callback"]),
    selectedCount: countCandidatesForCastingRole(candidates, role, [
      "selected",
      "availability_requested",
      "offer_sent",
      "accepted",
    ]),
    confirmedCount: countCandidatesForCastingRole(candidates, role, ["confirmed"]),
  }));
}

export function getCastingAttentionItems(input: {
  projectId: string;
  casting: CastingProject | null;
  roles: CastingRole[];
  candidates: CastingCandidate[];
}): CastingAttentionItem[] {
  const { projectId, casting, roles, candidates } = input;
  const items: CastingAttentionItem[] = [];

  const newSubmissions = candidates.filter((c) =>
    NEW_SUBMISSION_CANDIDATE_STATUSES.includes(c.status),
  ).length;
  if (newSubmissions > 0) {
    items.push({
      id: "new-submissions",
      priority: "high",
      message: `${newSubmissions} new submission${newSubmissions === 1 ? "" : "s"} need review`,
      href: castingWorkspaceHref(projectId, "review", { stage: "new" }),
      actionLabel: "Review",
    });
  }

  const pendingOffers = candidates.filter((c) => c.status === "offer_sent").length;
  if (pendingOffers > 0) {
    items.push({
      id: "pending-offers",
      priority: "high",
      message: `${pendingOffers} offer${pendingOffers === 1 ? "" : "s"} awaiting response`,
      href: castingWorkspaceHref(projectId, "cast"),
      actionLabel: "View cast",
    });
  }

  if (casting?.submissionDeadline) {
    const deadline = new Date(casting.submissionDeadline);
    const now = new Date();
    const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 1) {
      items.push({
        id: "submission-deadline",
        priority: "high",
        message:
          diffDays === 0
            ? "Submission deadline is today"
            : "Submission deadline is tomorrow",
        href: castingWorkspaceHref(projectId, "breakdown"),
      });
    }
  }

  for (const role of roles) {
    const confirmed = countCandidatesForCastingRole(candidates, role, ["confirmed"]);
    const needed = role.quantityNeeded - confirmed;
    if (needed > 0 && role.status === "published") {
      items.push({
        id: `role-${role.id}-open`,
        priority: "medium",
        message: `${role.name} still needs ${needed} selection${needed === 1 ? "" : "s"}`,
        href: castingWorkspaceHref(projectId, "cast", { roleId: role.bridgedRoleId ?? role.id }),
      });
    }
  }

  const unrespondedInvites = candidates.filter((c) => c.status === "invited").length;
  if (unrespondedInvites > 0) {
    items.push({
      id: "unresponded-invites",
      priority: "medium",
      message: `${unrespondedInvites} invited dancer${unrespondedInvites === 1 ? "" : "s"} have not responded`,
      href: castingWorkspaceHref(projectId, "talent-search"),
    });
  }

  return items.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
}
