import assert from "node:assert/strict";
import test from "node:test";
import { isAccountAuthoredSubmission } from "../src/lib/talent-buyers/casting/submission-origin";
test("contact enrichment requires the actual applicant's captured origin", () => {
  assert.equal(isAccountAuthoredSubmission({ talent_id: "talent", submitted_by: "talent" }), true);
  assert.equal(isAccountAuthoredSubmission({ talent_id: "talent", submitted_by: "operator" }), false);
  assert.equal(isAccountAuthoredSubmission({ talent_id: "talent", submitted_by: null }), false);
  assert.equal(isAccountAuthoredSubmission({ talent_id: "talent" }), false);
  assert.equal(isAccountAuthoredSubmission({ talent_id: null, submitted_by: null }), false);
});
