import { projectWorkspacePath } from "@/lib/talent-buyers/project-routes";

import type {
  CastingWorkspaceTabId,
  FindTalentView,
  OutreachView,
  ReviewStageFilter,
} from "./casting-types";

export const CASTING_WORKSPACE_TAB_IDS: CastingWorkspaceTabId[] = [
  "breakdown",
  "talent-search",
  "review",
  "client-review",
  "cast",
];

const FIND_TALENT_OUTREACH_VIEWS: OutreachView[] = ["invitations", "casting-link", "external"];

export type ClientReviewSegment = "final-selects" | "share";

/** Legacy workspace tab ids → new tab + query/hash. */
export const LEGACY_CASTING_TAB_REDIRECTS: Record<
  string,
  { tab: CastingWorkspaceTabId; query?: Record<string, string>; hash?: string }
> = {
  roles: { tab: "breakdown", hash: "roles" },
  invitations: { tab: "talent-search" },
  submissions: { tab: "review", query: { stage: "submitted" } },
  shortlist: { tab: "client-review" },
  selections: { tab: "cast" },
};

export function isCastingWorkspaceRouteValid(tab: string): tab is CastingWorkspaceTabId {
  return CASTING_WORKSPACE_TAB_IDS.includes(tab as CastingWorkspaceTabId);
}

export function resolveLegacyCastingWorkspaceTab(
  workspaceTab: string,
  query?: Record<string, string | string[] | undefined>,
): {
  tab: string;
  redirectUrl?: string;
} {
  if (workspaceTab === "outreach") {
    const view = typeof query?.view === "string" ? query.view : null;
    if (view && FIND_TALENT_OUTREACH_VIEWS.includes(view as OutreachView)) {
      return {
        tab: "talent-search",
        redirectUrl: `/workspace/talent-search?view=${view}`,
      };
    }
    return { tab: "client-review", redirectUrl: "/workspace/client-review" };
  }

  const legacy = LEGACY_CASTING_TAB_REDIRECTS[workspaceTab];
  if (!legacy) return { tab: workspaceTab };

  const params = new URLSearchParams(legacy.query ?? {});
  const queryString = params.toString();
  const hash = legacy.hash ? `#${legacy.hash}` : "";
  return {
    tab: legacy.tab,
    redirectUrl: `/workspace/${legacy.tab}${queryString ? `?${queryString}` : ""}${hash}`,
  };
}

export function castingWorkspaceHref(
  projectId: string,
  tab: CastingWorkspaceTabId,
  opts?: {
    view?: FindTalentView | OutreachView;
    stage?: ReviewStageFilter | "submitted" | "shortlisted";
    roleId?: string;
    hash?: string;
    segment?: ClientReviewSegment | "shortlist";
  },
): string {
  const base = projectWorkspacePath(projectId, tab);
  const params = new URLSearchParams();
  if (opts?.view && opts.view !== "search") params.set("view", opts.view);
  if (opts?.stage) params.set("stage", opts.stage);
  if (opts?.roleId) params.set("role", opts.roleId);
  if (opts?.segment && opts.segment !== "final-selects" && opts.segment !== "shortlist") {
    params.set("segment", opts.segment);
  }
  const query = params.toString();
  const hash = opts?.hash ? `#${opts.hash}` : "";
  return `${base}${query ? `?${query}` : ""}${hash}`;
}

export function parseOutreachView(value: string | null | undefined): OutreachView {
  if (value === "casting-link" || value === "external") return value;
  return "invitations";
}

export function parseFindTalentView(value: string | null | undefined): FindTalentView {
  if (value === "invitations" || value === "casting-link" || value === "external") return value;
  return "search";
}

export function parseClientReviewSegment(
  value: string | null | undefined,
): ClientReviewSegment {
  if (value === "share") return "share";
  // Legacy "shortlist" maps to Final Selects
  return "final-selects";
}

export function parseReviewStage(value: string | null | undefined): ReviewStageFilter {
  const allowed: ReviewStageFilter[] = [
    "all",
    "new",
    "in_review",
    "shortlisted",
    "callback",
    "selected",
    "not_moving_forward",
  ];
  if (value === "submitted") return "new";
  if (value && allowed.includes(value as ReviewStageFilter)) {
    return value as ReviewStageFilter;
  }
  return "all";
}
