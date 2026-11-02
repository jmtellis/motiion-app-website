import assert from "node:assert/strict";
import test from "node:test";
import { mergeSubmissionCandidates } from "../src/lib/talent-buyers/casting/casting-workflow-data";
import type { CastingCandidate } from "../src/lib/talent-buyers/casting/casting-types";
const pipeline = { id: "candidate", castingProjectId: "casting", source: "public_submission", submissionId: "submission", roleIds: ["role"], status: "shortlisted", displayName: "Movement artist" } as CastingCandidate;
const submission = { ...pipeline, id: "submission-submission", status: "submitted", displayName: "Parity talent", talentUserId: "talent" } as CastingCandidate;

test("shortlisting retains the submitted person's identity instead of the legacy role-title fallback", () => {
  const merged = mergeSubmissionCandidates([pipeline], [submission]);
  assert.equal(merged.length, 1); assert.equal(merged[0].displayName, "Parity talent");
  assert.equal(merged[0].id, "candidate"); assert.equal(merged[0].status, "shortlisted");
  assert.equal(merged[0].talentUserId, "talent"); assert.deepEqual(merged[0].roleIds, ["role"]);
});

test("an unavailable submission identity does not erase an existing known person's name", () => {
  assert.equal(mergeSubmissionCandidates([{ ...pipeline, displayName: "Alex Smith" }], [{ ...submission, displayName: "Applicant" }])[0].displayName, "Alex Smith");
});
