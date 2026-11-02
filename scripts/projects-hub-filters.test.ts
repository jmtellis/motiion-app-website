import assert from "node:assert/strict";
import test from "node:test";
import { filterProjects, projectHubQuery, projectScope } from "../src/lib/talent-buyers/projects-hub-filters";
const rows = [
  { id: "draft", title: "Summer film", status: "draft", projectType: "casting", lastUpdated: "2026-10-31" },
  { id: "live", title: "Summer tour", status: "active", projectType: "casting", lastUpdated: "2026-10-30" },
  { id: "old", title: "Previous tour", status: "archived", projectType: "casting", lastUpdated: "2026-10-29" },
  { id: "class", title: "Movement class", status: "active", projectType: "production", workKind: "activity", workTypeLabel: "Class", lastUpdated: "2026-11-01" },
];
test("Active is the default, including old all and unsupported scopes", () => {
  for (const value of [null, undefined, "all", "browse", "focus", "wrong"]) assert.equal(projectScope(value), "active");
  assert.equal(projectScope("drafts"), "draft");
  assert.deepEqual(filterProjects(rows, { scope: projectScope(null) }).map((r) => r.id), ["class", "live"]);
});
test("drafts and archives remain separate and search never changes scope", () => {
  assert.deepEqual(filterProjects(rows, { scope: "draft", query: "  SUMMER " }).map((r) => r.id), ["draft"]);
  assert.deepEqual(filterProjects(rows, { scope: "active", query: "previous" }), []);
  assert.deepEqual(filterProjects(rows, { scope: "active", type: "casting" }).map((r) => r.id), ["live"]);
  assert.deepEqual(filterProjects(rows, { scope: "active", type: "class" }).map((r) => r.id), ["class"]);
});
test("legacy preferences are removed while creation and unrelated context survive", () => {
  const params = new URLSearchParams("view=focus&layout=list&scope=all&create=1&intent=casting");
  assert.equal(projectHubQuery(params, "active"), "create=1&intent=casting");
  assert.equal(projectHubQuery(params, "draft"), "create=1&intent=casting&scope=draft");
  assert.equal(params.get("view"), "focus", "normalization does not mutate the caller");
});
test("filtering leaves caller order intact and handles invalid update timestamps", () => {
  const original = rows.map((row) => row.id);
  filterProjects(rows, { scope: "active" });
  assert.deepEqual(rows.map((row) => row.id), original);
  assert.equal(filterProjects([{ ...rows[1], lastUpdated: "bad" }, rows[3]], { scope: "active" })[0].id, "class");
});

test("casting and class filters include composable project abilities", () => {
  const project = { ...rows[1], projectType: "production", abilities: [{ id: "casting" }, { id: "classes" }] };
  assert.equal(filterProjects([project], { scope: "active", type: "casting" }).length, 1);
  assert.equal(filterProjects([project], { scope: "active", type: "class" }).length, 1);
});
