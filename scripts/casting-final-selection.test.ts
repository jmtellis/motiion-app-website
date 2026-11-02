import assert from "node:assert/strict";
import test from "node:test";
import { finalSubmissionIds, finalSelectionDisplayStatus } from "../src/lib/talent-buyers/casting/final-selection";

test("finalizing a role includes checked selections but never all approved or callback submissions", () => {
  const result = finalSubmissionIds({ roleId: "lead", submissions: [{ id: "chosen", status: "approved" }, { id: "shortlisted", status: "approved" }, { id: "callback", status: "approved" }], candidates: [
    { submission_id: "chosen", status: "selected", role_ids: ["lead"] },
    { submission_id: "shortlisted", status: "shortlisted", role_ids: ["lead"] },
    { submission_id: "callback", status: "callback", role_ids: ["lead"] },
  ] });
  assert.deepEqual(result, ["chosen"]);
});
test("requested availability remains a final selection and foreign submissions cannot enter the cast", () => {
  assert.deepEqual(finalSubmissionIds({ roleId: "lead", submissions: [{ id: "chosen", status: "approved" }], candidates: [
    { submission_id: "chosen", status: "availability_requested", role_ids: ["lead"] },
    { submission_id: "foreign", status: "selected", role_ids: ["lead"] },
    { submission_id: "chosen", status: "shortlisted", role_ids: ["other-role"] },
  ] }), ["chosen"]);
});
test("iOS saved final selections survive without pipeline records; explicit deselection removes one", () => {
  assert.deepEqual(finalSubmissionIds({ roleId: "lead", submissions: [{ id: "ios", status: "approved" }, { id: "removed", status: "approved" }], savedIds: ["ios", "removed", "foreign"], candidates: [
    { submission_id: "removed", status: "shortlisted", role_ids: ["lead"] },
  ] }), ["ios"]);
});
test("saved iOS selections display as selected without changing confirmed status or mutating the input", () => {
  const input = { submissionId: "ios", status: "shortlisted" as const };
  assert.equal(finalSelectionDisplayStatus(input, new Set(["ios"])).status, "selected");
  assert.equal(input.status, "shortlisted");
  assert.equal(finalSelectionDisplayStatus({ submissionId: "ios", status: "confirmed" }, new Set(["ios"])).status, "confirmed");
  assert.equal(finalSelectionDisplayStatus(input, new Set()).status, "shortlisted");
});

test("withdrawn, rejected, or pending submissions cannot be finalized from a stale pipeline or saved IDs", () => {
  const submissions = ["withdrawn", "rejected", "pending"].map((status) => ({ id: status, status }));
  assert.deepEqual(finalSubmissionIds({ roleId: "lead", submissions, savedIds: ["withdrawn", "rejected", "pending"], candidates: submissions.map((submission) => ({ submission_id: submission.id, status: "selected", role_ids: ["lead"] })) }), []);
});

test("a saved final selection never hides a later withdrawal or rejection", () => {
  for (const status of ["withdrawn", "not_moving_forward", "declined", "released"] as const) assert.equal(finalSelectionDisplayStatus({ submissionId: "id", status }, new Set(["id"])).status, status);
});
