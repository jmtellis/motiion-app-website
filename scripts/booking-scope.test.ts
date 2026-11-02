import assert from "node:assert/strict";
import test from "node:test";
import { coordinationSchema } from "../src/lib/talent-buyers/coordination-schema";
import { dealMemoNotificationHref } from "../src/lib/booking/deal-memo-routes";
const base = { project_id: "00000000-0000-4000-8000-000000000001", talent_name: "  Jordan  ", role: "Lead", status: "draft", start_date: "2026-11-02", end_date: "2026-11-04", negotiation_notes: "Confirm call time" };
test("coordination accepts supported details and strips obsolete financial mutations", () => {
  const parsed = coordinationSchema.parse({ ...base, fee_cents: 100000, currency: "USD", terms: "contract", payer_name: "payer", payer_email: "payer@example.test" });
  assert.equal(parsed.talent_name, "Jordan");
  assert.deepEqual(Object.keys(parsed).sort(), Object.keys(base).sort());
  assert.equal("terms" in parsed, false);
  assert.equal("fee_cents" in parsed, false);
});
test("invalid dates, financial statuses, and empty names cannot be saved", () => {
  assert.equal(coordinationSchema.safeParse({ ...base, status: "paid" }).success, false);
  assert.equal(coordinationSchema.safeParse({ ...base, talent_name: " " }).success, false);
  assert.equal(coordinationSchema.safeParse({ ...base, end_date: "2026-11-01" }).success, false);
  assert.equal(coordinationSchema.safeParse({ ...base, start_date: "2026-02-30" }).success, false);
  assert.equal(coordinationSchema.safeParse({ ...base, start_date: null, end_date: null }).success, true);
});
test("historical notification links retain a safe route to the retirement notice", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  assert.equal(dealMemoNotificationHref({ type: "booking_deal_memo", data: { memo_id: id, recipient_role: "talent" } }), `/deal-memos/${id}`);
  assert.equal(dealMemoNotificationHref({ type: "booking_deal_memo", data: { memo_id: "https://bad.test", recipient_role: "industry" } }), null);
});
