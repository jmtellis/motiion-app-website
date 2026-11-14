import assert from "node:assert/strict";
import { test } from "node:test";
import { findWorkspaceRole, roleWorkspaceHref } from "../src/lib/talent-buyers/casting/role-workspace";
import type { CastingRole } from "../src/lib/talent-buyers/casting/casting-types";
const role = { id: "role-a", bridgedRoleId: "public-a", bridgedRoleIds: ["older-a"], name: "Dancers" } as CastingRole;
test("role workspace resolves canonical and bridged IDs without falling back to another role", () => {
  for (const id of ["role-a", "public-a", "older-a"]) assert.equal(findWorkspaceRole([role], id), role);
  assert.equal(findWorkspaceRole([role], "missing"), undefined);
  assert.equal(findWorkspaceRole([role], null), undefined);
});
test("every workflow link retains the role and shortlist is a scoped review stage", () => {
  for (const view of ["review", "shortlist", "cast", "talent-search", "client-review"] as const) {
    const url = new URL(roleWorkspaceHref("project", "role-a", view), "https://example.test");
    assert.equal(url.searchParams.get("role"), "role-a");
    assert.equal(url.searchParams.get("stage"), view === "shortlist" ? "shortlisted" : null);
  }
});
