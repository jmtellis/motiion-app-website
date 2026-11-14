import assert from "node:assert/strict";
import { test } from "node:test";
import { castingShareState } from "../src/lib/talent-buyers/casting/casting-share-state";

test("only published public and unlisted castings expose an application link", () => {
 for (const visibility of ["public", "unlisted"] as const) {
  assert.equal(castingShareState({status:"published",visibility}, [{bridgedRoleId:"role-1"}]).path, "/casting/role-1");
  for (const status of ["draft", "paused", "closed", "archived"] as const) assert.equal(castingShareState({status,visibility}, [{bridgedRoleId:"role-1"}]).path, null);
 }
});
test("invitation-only and missing-role castings never expose a public share link", () => {
 for (const visibility of ["private", "invitation_only"] as const) {
  const state = castingShareState({status:"published",visibility}, [{bridgedRoleId:"role-1"}]);
  assert.equal(state.path,null); assert.equal(state.invitationOnly,true);
 }
 assert.equal(castingShareState({status:"published",visibility:"public"}, []).path,null);
 assert.equal(castingShareState(null, []).path,null);
});
