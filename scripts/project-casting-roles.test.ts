import assert from "node:assert/strict";
import { test } from "node:test";
import { mapProjectRoleRow } from "../src/lib/talent-buyers/casting/workspace-role-mapping";
import { findWorkspaceRole } from "../src/lib/talent-buyers/casting/role-workspace";
import { resolveWorkspaceProjectType } from "../src/lib/talent-buyers/project-abilities";

test("app project roles appear without child casting records and retain their submission IDs", () => {
  const rows = [
    { id: "male-dancers", title: "Male Dancers", casting_id: null, people_needed: 2 },
    { id: "freestyler", title: "Hip Hop Freestyler", casting_id: null, people_needed: 1 },
  ];
  const roles = rows.map((row) => mapProjectRoleRow(row, "project"));
  assert.deepEqual(roles.map((role) => role.name), ["Male Dancers", "Hip Hop Freestyler"]);
  for (const row of rows) {
    const role = findWorkspaceRole(roles, row.id)!;
    assert.equal(role.id, row.id);
    assert.equal(role.bridgedRoleId, row.id);
    assert.deepEqual(role.bridgedRoleIds, [row.id]);
    assert.equal(role.quantityNeeded, row.people_needed);
  }
});

test("project role mapping retains app age, visibility and finalization fields", () => {
  const role = mapProjectRoleRow({ id: "role", title: "Dancer", age_range_min: 18, age_range_max: 35,
    is_active: false, is_casting_finalized: true, height_min: "5'6\"", visibility: "private", slate_required: true,
  }, "project");
  assert.deepEqual(role.ageRange, { min: 18, max: 35 });
  assert.equal(role.isCastingFinalized, true);
  assert.equal(role.isActive, false);
  assert.equal(role.visibility, "private");
  assert.equal(role.slateRequired, true);
  assert.equal(role.heightMinDisplay, "5'6\"");
});

test("an app production with casting enabled opens the casting workspace", () => {
  const project = { project_type: "production", is_composable: true, enabled_modules: { casting: true } };
  assert.equal(resolveWorkspaceProjectType(project), "casting");
});
