import assert from "node:assert/strict";
import { test } from "node:test";
import { projectCardDate } from "../src/lib/talent-buyers/project-card-date";

test("project card dates use month and day without shifting calendar dates", () => {
  assert.equal(projectCardDate("2026-11-11", null), "Nov 11");
  assert.equal(projectCardDate("2026-11-11", "2026-11-14"), "Nov 11 – Nov 14");
  assert.equal(projectCardDate("2026-12-31", "2027-01-02"), "Dec 31 – Jan 2");
  assert.equal(projectCardDate("2026-11-11", "2026-11-11"), "Nov 11");
});
test("undated and invalid dates have an honest fallback", () => {
  assert.equal(projectCardDate(null, null), "Dates to be announced");
  assert.equal(projectCardDate("invalid", "2026-11-11"), "Nov 11");
  assert.equal(projectCardDate("2026-02-30", null), "Dates to be announced");
});
