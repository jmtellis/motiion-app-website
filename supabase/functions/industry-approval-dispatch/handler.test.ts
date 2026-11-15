import { test } from "node:test";
import assert from "node:assert/strict";
import { createHandler } from "./handler.ts";
import { approvalURL } from "./delivery.ts";
function fixture({ channel = "email", status = 200, approved = true, pushEnabled = true, throws = false, event = "approved", currentStatus = undefined as string | undefined, version = 1, accountEmail = undefined as string | undefined } = {}) {
  const sent: Array<{ url: string; init?: RequestInit }> = [];
  const ack: any[] = [];
  let claims = 0;
  const row = { event_kind: event, id: "00000000-0000-0000-0000-000000000001", user_id: "fixture", application_version: 1, channel, destination: channel === "email" ? "fixture@example.invalid" : "fake-device-token", lease_id: "lease" };
  const db: any = { auth: { admin: { getUserById: async () => ({ data: { user: { email: accountEmail ?? row.destination } } }) } },
    from: (name: string) => { const data = name === "industry_approval_delivery_config" ? { email_enabled: true, push_enabled: true } : name === "industry_applications" ? { status: currentStatus ?? (approved ? "approved" : "pending"), version } : name === "profiles" ? { notifications_enabled: pushEnabled } : { id: "token" }; const query: any = { select: () => query, eq: () => query, single: async () => ({ data }), maybeSingle: async () => ({ data }) }; return query; },
    rpc: async (name: string, args: unknown) => { if (name.startsWith("claim")) { claims++; return { data: [row] }; } ack.push(args); return {}; },
  };
  const handler = createHandler({ db, env: (name) => name === "NOTIF_DISPATCH_SECRET" ? "test-secret" : name === "INDUSTRY_APPROVAL_URL" ? "https://staging.example.invalid/industry/approved" : "fake-provider-value", send: async (url, init) => { sent.push({ url: String(url), init }); if (throws) throw new Error("timeout"); return new Response(null, { status }); }, jwt: async () => "fake-jwt", baseURL: () => "https://apns.example.invalid" });
  const run = (secret = "test-secret") => handler(new Request("https://worker.example.invalid", { method: "POST", headers: { "x-notif-dispatch-secret": secret } }));
  return { run, sent, ack, claims: () => claims };
}
test("unauthenticated caller cannot claim or send", async () => { const f = fixture(); assert.equal((await f.run("wrong")).status, 401); assert.equal(f.claims(), 0); assert.equal(f.sent.length, 0); });
test("email retries retain provider idempotency key and account destination", async () => { const f = fixture({ status: 429 }); await f.run(); await f.run(); assert.equal(f.ack[0].p_result, "retry"); assert.deepEqual(f.sent[0].init?.headers, f.sent[1].init?.headers); const body = JSON.parse(f.sent[0].init?.body as string); assert.deepEqual(body.to, ["fixture@example.invalid"]); assert.match(body.text, /https:\/\/staging.example.invalid\/industry\/approved/); });
test("success acknowledged; permanent provider failure terminal", async () => { for (const status of [200, 400]) { const f=fixture({status}); await f.run(); assert.equal(f.ack[0].p_result, status===200 ? "sent" : "failed"); } });
test("network uncertainty leaves delivery retryable", async () => { const f=fixture({throws:true}); await f.run(); assert.equal(f.ack[0].p_result,"retry"); });
test("withdrawn approval never sends", async () => { const f=fixture({approved:false}); await f.run(); assert.equal(f.sent.length,0); assert.equal(f.ack[0].p_result,"skipped"); });
test("push respects preference and uses stable APNs identifiers", async () => { const disabled=fixture({channel:"push",pushEnabled:false}); await disabled.run(); assert.equal(disabled.sent.length,0); const enabled=fixture({channel:"push"}); await enabled.run(); await enabled.run(); assert.deepEqual(enabled.sent[0].init?.headers,enabled.sent[1].init?.headers); const payload=JSON.parse(enabled.sent[0].init?.body as string); assert.equal(payload.motiion.type,"industry_application_approved"); });
test("approval landing configuration rejects insecure or credential URLs", () => { for(const value of [undefined,"http://example.invalid/industry/approved","https://u:p@example.invalid/industry/approved","https://example.invalid/other"]) assert.throws(()=>approvalURL(value)); });

test("more-info request sends actionable email without claiming approval", async () => {
  const f = fixture({ event: "needs_information", currentStatus: "needs_information" });
  await f.run();
  assert.equal(f.ack[0].p_result, "sent");
  const body = JSON.parse(f.sent[0].init?.body as string);
  assert.match(body.subject, /more information/);
  assert.match(body.text, /read the feedback/);
  assert.match(body.text, /has not been approved/);
  assert.match(body.text, /https:\/\/staging.example.invalid\/industry\/approved/);
});
test("resubmitted or superseded requests never send stale email", async () => {
  for (const state of ["pending", "approved", "rejected"]) {
    const f = fixture({ event: "needs_information", currentStatus: state });
    await f.run(); assert.equal(f.sent.length, 0); assert.equal(f.ack[0].p_result, "skipped");
  }
  const f = fixture({ event: "needs_information", currentStatus: "needs_information", version: 2 });
  await f.run(); assert.equal(f.sent.length, 0);
});
test("more-info never sends push or to an outdated account address", async () => {
  for (const options of [{ channel: "push" }, { accountEmail: "changed@example.invalid" }]) {
    const f = fixture({ event: "needs_information", currentStatus: "needs_information", ...options });
    await f.run(); assert.equal(f.sent.length, 0); assert.equal(f.ack[0].p_result, "skipped");
  }
});

 test("submission receipt acknowledges review and links to the application", async () => {
   const f = fixture({event: "submitted", currentStatus: "pending"}); await f.run();
   assert.equal(f.ack[0].p_result, "sent");
   const body = JSON.parse(f.sent[0].init?.body as string);
   assert.match(body.subject, /received/); assert.match(body.text, /now in review/);
   assert.match(body.text, /https:\/\/staging.example.invalid\/talent-buyers\/application/);
   assert.match(body.text, /does not grant industry access/);
 });
 test("submission receipts skip obsolete versions, reviewed applications, push and changed email", async () => {
   for (const options of [{version: 2}, {currentStatus: "approved"}, {currentStatus: "needs_information"}, {channel: "push"}, {accountEmail: "other@example.invalid"}]) {
     const f = fixture({event: "submitted", currentStatus: "pending", ...options}); await f.run();
     assert.equal(f.sent.length, 0); assert.equal(f.ack[0].p_result, "skipped");
   }
 });
