import assert from "node:assert/strict";
import test from "node:test";
import { castingDetailLocation } from "../src/lib/casting/detail-location";

test("inspecting another role updates the reloadable role without losing parent tab context", () => {
  const url = castingDetailLocation("https://motiion.app/opportunities?tab=invited&casting=first&view=project#details", "second", "role");
  assert.equal(url, "/opportunities?tab=invited&casting=second&view=role#details");
});

test("returning to the casting preserves the selected role for refresh and leaves tab unchanged", () => {
  assert.equal(castingDetailLocation("/opportunities?tab=submitted&casting=second&view=role", "second", "project"), "/opportunities?tab=submitted&casting=second&view=project");
});
