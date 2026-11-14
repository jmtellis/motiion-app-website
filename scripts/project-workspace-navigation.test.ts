import assert from "node:assert/strict";
import { test } from "node:test";
import { CASTING_VIEWS, castingViewHref, projectConversations, projectDrillIn, projectWorkspaceSection, projectWorkspaceSections } from "../src/lib/talent-buyers/project-workspace-navigation";
import { projectLandingPath } from "../src/lib/talent-buyers/project-routes";
import { CASTING_WORKSPACE_TAB_IDS } from "../src/lib/talent-buyers/casting/casting-routes";

test("projects open Manage and keep focused casting pages under Manage", () => {
  assert.equal(projectLandingPath("p1", "casting"), "/projects/p1/overview");
  assert.deepEqual(projectWorkspaceSections("p1").map(({ label }) => label), ["Manage", "Schedule", "Messages"]);
  for (const view of CASTING_VIEWS) {
    const href = castingViewHref("p1", view.id)!;
    assert.equal(projectWorkspaceSection(href, "p1"), "manage");
    assert.equal(projectDrillIn(href, "p1"), "Casting");
  }
  assert.deepEqual([...CASTING_VIEWS.map(({ id }) => id)].sort(), [...CASTING_WORKSPACE_TAB_IDS].sort());
  assert.equal(castingViewHref("p1", "unknown"), null);
  assert.equal(projectWorkspaceSection("/projects/p1/timeline", "p1"), "schedule");
  assert.equal(projectWorkspaceSection("/projects/p1/messages", "p1"), "messages");
  assert.equal(projectDrillIn("/projects/p1/roster", "p1"), "People");
});

test("project Messages scopes by context IDs rather than similar titles", () => {
  const rows = [
    { context_type: "project", context_id: "p1", context_title: "Same title" },
    { context_type: "project", context_id: "p2", context_title: "Same title" },
    { context_type: "casting", context_id: "c1", context_title: "Casting" },
    { context_type: "class", context_id: "a1", context_title: "Class" },
    { context_type: "project", context_id: null, context_title: "Same title" },
    { context_type: "event", context_id: "a2", context_title: "Same title" },
  ];
  assert.deepEqual(projectConversations(rows, "p1", ["c1"], ["a1"]), [rows[0], rows[2], rows[3]]);
});
