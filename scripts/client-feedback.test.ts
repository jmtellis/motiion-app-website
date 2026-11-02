import assert from "node:assert/strict";
import { test } from "node:test";
import { groupClientFeedback, tallyClientFeedback, type ClientFeedbackRow } from "../src/lib/talent-buyers/casting/client-feedback";

const row = (patch: Partial<ClientFeedbackRow> = {}): ClientFeedbackRow => ({
  id: "vote-1", recipient_id: "reviewer-1", submission_id: "talent-1", vote: "yes", updated_at: "2026-11-02T12:00:00Z",
  submission: { role_id: "role-1", talent: { full_name: " Taylor " } }, reviewer: { display_name: " Client A " }, ...patch,
});

test("feedback keeps named decisions for secondary roles, excludes unrelated and invalid votes", () => {
  const reviews = groupClientFeedback([
    row(), row({ id: "vote-2", submission_id: "talent-2", vote: "no", submission: { role_id: "role-2", talent: null } }),
    row({ submission_id: "other-role", submission: { role_id: "other" } }), row({ vote: "pending", submission_id: "pending" }),
  ], ["role-1", "role-2"]);
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].reviewerName, "Client A");
  assert.deepEqual(reviews[0].choices.map(({ name, selected }) => ({ name, selected })), [
    { name: "Taylor", selected: true }, { name: "Unavailable profile", selected: false },
  ]);
});

test("latest correction wins for a reviewer and talent without duplicating vote totals", () => {
  const reviews = groupClientFeedback([
    row(), row({ id: "correction", vote: "no", updated_at: "2026-11-02T13:00:00Z" }), row(),
    row({ id: "second-reviewer", recipient_id: "reviewer-2", reviewer: null, updated_at: "2026-11-02T14:00:00Z" }),
  ], ["role-1"]);
  assert.equal(reviews[0].reviewerId, "reviewer-2");
  assert.equal(reviews[0].reviewerName, "Reviewer");
  assert.deepEqual(tallyClientFeedback(reviews), { "talent-1": { submissionId: "talent-1", yesCount: 1, noCount: 1 } });
});

test("a failed or empty response cannot invent a reviewer or a vote", () => {
  assert.deepEqual(groupClientFeedback([], ["role-1"]), []);
  assert.deepEqual(groupClientFeedback([row({ updated_at: "invalid" }), row({ recipient_id: "" })], ["role-1"]), []);
  assert.deepEqual(tallyClientFeedback([]), {});
});
