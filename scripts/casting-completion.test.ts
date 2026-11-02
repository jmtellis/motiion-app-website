import assert from "node:assert/strict";
import test from "node:test";
import { isCastingFullyFinalized, castingReviewEmptyState, castingOverviewState } from "../src/lib/talent-buyers/casting/casting-completion";
test("casting finalization requires every real role to be locked, including mixed and empty workspaces", () => {
  assert.equal(isCastingFullyFinalized([]), false);
  assert.equal(isCastingFullyFinalized([{ isCastingFinalized: true }]), true);
  assert.equal(isCastingFullyFinalized([{ isCastingFinalized: true }, { isCastingFinalized: false }]), false);
  assert.equal(isCastingFullyFinalized([{ isCastingFinalized: true }, {}]), false);
});
test("overview reflects locked selections and distinguishes unlisted access from public casting", () => {
  const finalized = castingOverviewState({ roles: [{ isCastingFinalized: true }], status: "open", visibility: "public" });
  assert.equal(finalized.label, "Finalized");
  assert.equal(finalized.finalized, true);
  const limited = castingOverviewState({ roles: [{}], status: "published", visibility: "unlisted" });
  assert.equal(limited.label, "Open");
  assert.match(limited.description, /not publicly listed/);
  assert.equal(castingOverviewState({ roles: [{}], status: "closed" }).label, "Closed");
  assert.equal(castingOverviewState({ roles: [], status: "draft" }).label, "Draft");
});
test("a finalized or reviewed pool never claims everyone is still shortlisted", () => {
  const finalized = castingReviewEmptyState({ finalized: true, reviewedCount: 1, shortlistedCount: 0 });
  assert.equal(finalized.title, "Selections finalized"); assert.equal(finalized.action, "cast");
  const reviewed = castingReviewEmptyState({ finalized: false, reviewedCount: 2, shortlistedCount: 0 });
  assert.equal(reviewed.title, "Review complete"); assert.equal(reviewed.action, "cast");
  assert.equal(castingReviewEmptyState({ finalized: false, reviewedCount: 0, shortlistedCount: 0 }).action, "invite");
});
