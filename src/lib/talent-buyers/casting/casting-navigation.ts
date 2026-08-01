import {
  CheckCircle2,
  FileText,
  Link2,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";

import type {
  CastingCandidate,
  CastingProject,
  CastingRole,
  CastingWorkspaceTabId,
} from "./casting-types";

export type CastingNavItem = {
  id: CastingWorkspaceTabId;
  label: string;
  icon: LucideIcon;
  description: string;
};

export const CASTING_WORKSPACE_NAV: CastingNavItem[] = [
  {
    id: "breakdown",
    label: "Breakdown",
    icon: FileText,
    description: "Define the casting, roles, requirements, and submission process.",
  },
  {
    id: "talent-search",
    label: "Invite",
    icon: Search,
    description: "Browse role-matched talent, review referrals, and invite dancers.",
  },
  {
    id: "review",
    label: "Review Submissions",
    icon: Users,
    description: "Evaluate candidates and move them through the casting process.",
  },
  {
    id: "client-review",
    label: "Client Review",
    icon: Link2,
    description: "Create and manage private links for client voting on shortlisted talent.",
  },
  {
    id: "cast",
    label: "Cast",
    icon: CheckCircle2,
    description: "Review client votes, pick Final Selects, book talent, and finalize casting.",
  },
];

export function getCastingWorkspaceNavigation(): CastingNavItem[] {
  return CASTING_WORKSPACE_NAV;
}

export type CastingPrimaryAction = {
  label: string;
  actionId: string;
  disabled?: boolean;
};

export type CastingWorkflowState = {
  hasBreakdown: boolean;
  roleCount: number;
  candidateCount: number;
  newSubmissionCount: number;
  selectedCount: number;
  confirmedCount: number;
  pendingOfferCount: number;
  castingStatus: CastingProject["status"] | "none";
};

export function deriveCastingWorkflowState(input: {
  primaryCasting?: CastingProject | null;
  casting?: CastingProject | null;
  roles: CastingRole[];
  candidates: CastingCandidate[];
}): CastingWorkflowState {
  const { roles, candidates } = input;
  const casting = input.primaryCasting ?? input.casting ?? null;
  const hasBreakdown = Boolean(casting?.title && casting.title !== "Untitled casting");
  return {
    hasBreakdown,
    roleCount: roles.length,
    candidateCount: candidates.length,
    newSubmissionCount: candidates.filter((c) => c.status === "submitted").length,
    selectedCount: candidates.filter((c) =>
      ["selected", "availability_requested", "offer_sent", "accepted"].includes(c.status),
    ).length,
    confirmedCount: candidates.filter((c) => c.status === "confirmed").length,
    pendingOfferCount: candidates.filter((c) => c.status === "offer_sent").length,
    castingStatus: casting?.status ?? "none",
  };
}

export function getCastingPrimaryAction(
  tab: CastingWorkspaceTabId,
  state: CastingWorkflowState,
): CastingPrimaryAction {
  switch (tab) {
    case "breakdown":
      if (state.castingStatus === "draft" || state.castingStatus === "none") {
        return { label: "Publish casting", actionId: "publish-casting" };
      }
      if (state.castingStatus === "closed") {
        return { label: "Reopen casting", actionId: "reopen-casting" };
      }
      return { label: "Preview casting", actionId: "preview-casting" };

    case "talent-search":
      return { label: "Search Talent", actionId: "search-talent", disabled: false };

    case "client-review":
      return { label: "Create client link", actionId: "create-client-link" };

    case "review":
      return { label: "Review next", actionId: "review-next", disabled: state.candidateCount === 0 };

    case "cast":
      if (state.castingStatus === "closed") {
        return { label: "Re-open", actionId: "reopen-casting" };
      }
      if (state.castingStatus === "published" || state.castingStatus === "paused") {
        return { label: "Close", actionId: "close-casting" };
      }
      return { label: "Close", actionId: "close-casting", disabled: true };

    default:
      return { label: "Continue", actionId: "continue" };
  }
}

export function getCastingPanelHeader(tab: CastingWorkspaceTabId): { title: string; description: string } {
  const item = CASTING_WORKSPACE_NAV.find((nav) => nav.id === tab);
  return {
    title: item?.label ?? tab,
    description: item?.description ?? "",
  };
}
