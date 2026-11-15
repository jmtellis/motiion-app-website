import test from "node:test";
import assert from "node:assert/strict";
import { canCreatePaidProject } from "../src/lib/billing/project-creation-access";
import type { ProjectAccess, ProjectReceipt } from "../src/lib/billing/project-catalog";
const free: ProjectAccess = { monthly_limit: 0, active_projects: 0, legacy: false, purchases: [] };
const pass: ProjectReceipt = { id: "pass", plan: "project_pass", provider: "stripe", status: "active", expires_at: null, project_id: null, activated_at: null };
test("unpaid and full accounts cannot create; available monthly capacity can", () => {
  assert.equal(canCreatePaidProject(free), false);
  assert.equal(canCreatePaidProject({...free, monthly_limit:1}), true);
  assert.equal(canCreatePaidProject({...free, monthly_limit:1, active_projects:1}), false);
});
test("only an unused active pass supplies extra capacity", () => {
  assert.equal(canCreatePaidProject({...free, purchases:[pass]}), true);
  for(const change of [{status:"revoked"},{project_id:"used"},{activated_at:"2026-01-01"},{expires_at:"2000-01-01"}]) {
    assert.equal(canCreatePaidProject({...free, purchases:[{...pass,...change}]}), false);
  }
});
