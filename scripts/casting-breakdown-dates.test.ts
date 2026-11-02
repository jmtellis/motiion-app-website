import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDateTime } from "../src/lib/talent-buyers/casting/casting-breakdown-prose";

test("date-only production days retain their civil day and omit invented time in all zones", () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ["America/Los_Angeles", "Pacific/Honolulu", "Pacific/Auckland"]) {
      process.env.TZ = zone;
      assert.match(formatDateTime("2026-11-20")!, /20/);
      assert.match(formatDateTime("2026-11-21")!, /21/);
      assert.doesNotMatch(formatDateTime("2026-11-20")!, /\d:\d|AM|PM/);
      assert.match(formatDateTime("2026-03-08")!, /8/);
    }
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test("invalid civil dates are not silently normalized and timed sessions retain time", () => {
  assert.equal(formatDateTime("2026-02-30"), "2026-02-30");
  assert.match(formatDateTime("2026-11-20T18:30:00Z")!, /\d:\d/);
});
