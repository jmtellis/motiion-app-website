import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultCastingComposerForm, createDefaultRole } from "../src/lib/talent-buyers/casting-composer-defaults";
import { castingComposerFormSchema, roleSubmissionOptionsSchema } from "../src/lib/talent-buyers/casting-schema";
import { buildBridgedRoleRow, buildChildCastingRow, buildChildCastingRoleRow, childCastingToComposerForm } from "../src/lib/talent-buyers/casting-child-payload";
import { buildRoleInsertRow, buildRpcRolesPayload } from "../src/lib/talent-buyers/casting-payload";
import { rolesToComposerRoles } from "../src/lib/talent-buyers/casting/workspace-casting-form";

const projectId = "432abf60-4ae6-49bb-9573-96e36cf5d4a4";
const castingId = "bd2cff3c-6876-449b-af8e-074f2fc47176";
const roleId = "768d984e-f3f5-4cb3-93ab-0023ba15b597";
function form() {
  return castingComposerFormSchema.parse({ ...createDefaultCastingComposerForm(), projectId, castingId,
    title: "New production", visibility: "private", isUnion: false,
    roles: [{ ...createDefaultRole(), id: roleId, title: "Movement artist", visibility: "private", gender: "Female",
      agencyRequired: true, slateRequired: true, maxSubmissionLinks: 3, submissionLimit: 45, talentPaysTravel: true,
      coverImageUrl: "https://example.test/role.jpg", cardColorPreset: "forest" }] });
}

test("role material and submission controls reject fractional, negative, oversized and nonfinite limits", () => {
  assert.deepEqual(roleSubmissionOptionsSchema.parse({}), { slateRequired: false, maxSubmissionLinks: 0, submissionLimit: 0, talentPaysTravel: false });
  for (const maxSubmissionLinks of [-1, 11, 1.5, Infinity, NaN]) assert.equal(roleSubmissionOptionsSchema.safeParse({ maxSubmissionLinks }).success, false);
  for (const submissionLimit of [-1, 1.5, 2147483648, Infinity, NaN]) assert.equal(roleSubmissionOptionsSchema.safeParse({ submissionLimit }).success, false);
  assert.equal(roleSubmissionOptionsSchema.safeParse({ maxSubmissionLinks: 10, submissionLimit: 0 }).success, true);
});

test("save and publication payloads preserve the same canonical per-role settings", () => {
  const value = form(), role = value.roles[0];
  for (const row of [buildBridgedRoleRow("owner", projectId, castingId, value, role, false), buildRoleInsertRow("owner", projectId, value, role, false), buildRpcRolesPayload(value, false)[0]]) {
    assert.equal(row.slate_required, true); assert.equal(row.max_submission_links, 3);
    assert.equal(row.submission_limit, 45); assert.equal(row.talent_pays_travel, true);
  }
  const child = buildChildCastingRow(projectId, value, true);
  const read = childCastingToComposerForm({ ...child, id: castingId, password_hash: "unread-secret", created_at: null },
    [{ ...buildChildCastingRoleRow(castingId, role), id: roleId }], projectId,
    [buildBridgedRoleRow("owner", projectId, castingId, value, role, true)]);
  assert.deepEqual(roleSubmissionOptionsSchema.parse(read.roles[0]), roleSubmissionOptionsSchema.parse(role));
  assert.equal(read.roles[0].gender, "Female"); assert.equal(read.roles[0].agencyRequired, true);
  assert.equal(read.roles[0].coverImageUrl, "https://example.test/role.jpg");
});

test("editing an unrelated section retains role media, identity, privacy and submission requirements", () => {
  const read = rolesToComposerRoles([{ id: roleId, castingProjectId: castingId, name: "Movement artist", quantityNeeded: 2,
    status: "published", order: 0, gender: "Female", agencyRequired: true, slateRequired: true,
    maxSubmissionLinks: 3, submissionLimit: 45, talentPaysTravel: true, visibility: "private", cardColorPreset: "forest",
    coverImageUrl: "https://example.test/role.jpg", clientMatchFilters: { genres: ["Ballet"] } }])[0];
  assert.equal(read.gender, "Female"); assert.equal(read.agencyRequired, true); assert.equal(read.visibility, "private");
  assert.equal(read.coverImageUrl, "https://example.test/role.jpg"); assert.equal(read.cardColorPreset, "forest");
  assert.deepEqual(read.clientMatchFilters, { genres: ["Ballet"] });
  assert.deepEqual(roleSubmissionOptionsSchema.parse(read), roleSubmissionOptionsSchema.parse(form().roles[0]));
});

test("empty edit passwords retain existing protected access instead of clearing it", () => {
  const value = form();
  assert.equal(buildChildCastingRow(projectId, value, false).password_hash, undefined);
  assert.equal(buildBridgedRoleRow("owner", projectId, castingId, value, value.roles[0], false).password_hash, undefined);
  assert.equal(typeof buildChildCastingRow(projectId, { ...value, password: "new casting secret" }, false).password_hash, "string");
});


test("editing a parent casting never widens a role's existing privacy", () => {
  const value = form();
  value.configuration.visibility_presentation_raw = null;
  for (const [parent, child, expected] of [
    ["public", "private", "private"], ["public", "unlisted", "unlisted"],
    ["private", "public", "private"], ["unlisted", "public", "unlisted"], ["public", "public", "public"],
  ] as const) {
    const row = buildBridgedRoleRow("owner", projectId, castingId, { ...value, visibility: parent }, { ...value.roles[0], visibility: child }, false);
    assert.equal(row.visibility, expected);
  }
});
