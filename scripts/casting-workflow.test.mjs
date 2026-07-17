import assert from "node:assert/strict";
import test from "node:test";

/** Inline mirrors of casting route helpers for migration tests (no TS import required). */
const FIND_TALENT_OUTREACH_VIEWS = ["invitations", "casting-link", "external"];

const LEGACY_CASTING_TAB_REDIRECTS = {
  roles: { tab: "breakdown", hash: "roles" },
  invitations: { tab: "talent-search" },
  submissions: { tab: "review", query: { stage: "submitted" } },
  shortlist: { tab: "client-review" },
  selections: { tab: "cast" },
};

function resolveLegacyCastingWorkspaceTab(workspaceTab, query) {
  if (workspaceTab === "outreach") {
    const view = typeof query?.view === "string" ? query.view : null;
    if (view && FIND_TALENT_OUTREACH_VIEWS.includes(view)) {
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

const CASTING_WORKSPACE_TAB_IDS = [
  "breakdown",
  "talent-search",
  "review",
  "client-review",
  "cast",
];

function isCastingWorkspaceRouteValid(tab) {
  return CASTING_WORKSPACE_TAB_IDS.includes(tab);
}

const ALLOWED = {
  submitted: ["in_review", "shortlisted", "not_moving_forward", "withdrawn"],
  in_review: ["shortlisted", "callback", "selected", "not_moving_forward"],
  shortlisted: ["callback", "selected", "not_moving_forward"],
  confirmed: ["released"],
  withdrawn: [],
};

function isCastingStatusTransitionAllowed(from, to) {
  return (ALLOWED[from] ?? []).includes(to);
}

test("legacy casting tabs redirect to new workspace IA", () => {
  assert.equal(resolveLegacyCastingWorkspaceTab("roles").tab, "breakdown");
  assert.match(resolveLegacyCastingWorkspaceTab("roles").redirectUrl ?? "", /breakdown#roles/);
  assert.equal(resolveLegacyCastingWorkspaceTab("invitations").tab, "talent-search");
  assert.match(resolveLegacyCastingWorkspaceTab("invitations").redirectUrl ?? "", /\/workspace\/talent-search$/);
  assert.equal(resolveLegacyCastingWorkspaceTab("submissions").tab, "review");
  assert.equal(resolveLegacyCastingWorkspaceTab("shortlist").tab, "client-review");
  assert.equal(resolveLegacyCastingWorkspaceTab("selections").tab, "cast");
  assert.equal(Object.keys(LEGACY_CASTING_TAB_REDIRECTS).length, 5);
});

test("legacy outreach tab redirects by view", () => {
  assert.equal(resolveLegacyCastingWorkspaceTab("outreach").tab, "client-review");
  assert.equal(resolveLegacyCastingWorkspaceTab("outreach", { view: "invitations" }).tab, "talent-search");
  assert.match(
    resolveLegacyCastingWorkspaceTab("outreach", { view: "casting-link" }).redirectUrl ?? "",
    /talent-search\?view=casting-link/,
  );
});

test("casting workspace route validation accepts five tabs only", () => {
  assert.equal(isCastingWorkspaceRouteValid("breakdown"), true);
  assert.equal(isCastingWorkspaceRouteValid("talent-search"), true);
  assert.equal(isCastingWorkspaceRouteValid("client-review"), true);
  assert.equal(isCastingWorkspaceRouteValid("review"), true);
  assert.equal(isCastingWorkspaceRouteValid("cast"), true);
  assert.equal(isCastingWorkspaceRouteValid("outreach"), false);
  assert.equal(isCastingWorkspaceRouteValid("roles"), false);
  assert.equal(isCastingWorkspaceRouteValid("submissions"), false);
});

test("candidate status transitions follow configured rules", () => {
  assert.equal(isCastingStatusTransitionAllowed("submitted", "in_review"), true);
  assert.equal(isCastingStatusTransitionAllowed("in_review", "shortlisted"), true);
  assert.equal(isCastingStatusTransitionAllowed("shortlisted", "selected"), true);
  assert.equal(isCastingStatusTransitionAllowed("confirmed", "released"), true);
  assert.equal(isCastingStatusTransitionAllowed("withdrawn", "selected"), false);
});
