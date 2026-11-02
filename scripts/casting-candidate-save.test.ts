import assert from "node:assert/strict";
import test from "node:test";
import { mergeDiscoveredCandidateSave } from "../src/lib/talent-buyers/casting/save-candidate";

const invite = { casting_id: "casting", project_id: "project", talent_profile_id: "person", invitation_id: "invite", role_ids: ["lead", "ensemble"], source: "invitation" as const, status: "invited" as const, display_name: "old-slug", created_by: "second-admin" };

test("inviting a selected person preserves their review result, original identity and prior roles", () => {
  const current = { status: "selected", source: "submission", created_by: "owner", display_name: "Élodie García", role_ids: ["lead", "understudy"] };
  const result = mergeDiscoveredCandidateSave(invite, current);
  assert.equal(result.status, "selected");
  assert.equal(result.source, "submission");
  assert.equal(result.created_by, "owner");
  assert.equal(result.display_name, "Élodie García");
  assert.equal(result.invitation_id, "invite");
  assert.deepEqual(result.role_ids, ["lead", "understudy", "ensemble"]);
  assert.deepEqual(current.role_ids, ["lead", "understudy"]);
});

test("saving a discovered person again does not undo a withdrawal or duplicate role membership", () => {
  const result = mergeDiscoveredCandidateSave({ ...invite, status: "discovered", source: "talent_search" }, { status: "withdrawn", source: "invitation", created_by: null, display_name: null, role_ids: ["lead", "ensemble"] });
  assert.equal(result.status, "withdrawn");
  assert.equal(result.display_name, "old-slug");
  assert.equal(result.created_by, null);
  assert.deepEqual(result.role_ids, ["lead", "ensemble"]);
});
