import assert from "node:assert/strict";
import { test } from "node:test";
import { approvedSetupDestination, recommendIndustryPlan } from "../src/lib/talent-buyers/approved-start";

test("uncertain and occasional applicants start without a recurring commitment", () => {
  for (const frequency of [undefined, "not_sure", "one_off", "occasional", "unknown"]) {
    assert.equal(recommendIndustryPlan("not_sure", frequency).plan, "project_pass");
  }
});
test("ongoing work suggests Studio and simultaneous productions suggest larger capacity", () => {
  assert.equal(recommendIndustryPlan("1", "ongoing").plan, "studio");
  for (const projects of ["2_3", "4_5", "6_plus"]) assert.equal(recommendIndustryPlan(projects, "ongoing").plan, "production_house");
  assert.match(recommendIndustryPlan("6_plus", "ongoing").reason, /covers five/);
});
test("approved setup routes only to known choices, preserving the legacy default", () => {
  assert.equal(approvedSetupDestination(), "/dashboard");
  assert.equal(approvedSetupDestination("explore"), "/talent");
  for (const plan of ["project_pass", "studio", "production_house"]) assert.equal(approvedSetupDestination(plan), `/checkout?plan=${plan}`);
  for (const invalid of ["", "https://example.com", "//example.com", "/admin", "studio&next=evil"]) assert.equal(approvedSetupDestination(invalid), null);
});
