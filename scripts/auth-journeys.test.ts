import assert from "node:assert/strict";
import { test } from "node:test";
import { authCallbackFailurePath, authLinkErrorMessage, resolveAuthCallbackOrigin, safeAuthReturnPath, resendSecondsRemaining } from "../src/lib/auth/redirects";
import { normalizeIndustryWorkUrl, parseIndustryApplicationDraft, validateIndustryApplicationStep, type IndustryApplicationDraft } from "../src/lib/talent-buyers/industry-application";
import { emailChangeStatus, emailChangeFailurePath } from "../src/lib/auth/email-change";
import { ensureOAuthProfile } from "../src/lib/auth/oauth-server";

const application: IndustryApplicationDraft = { full_name: "Avery Quinn", professional_role: "Producer", organization: "Independent", contact_email: "test@example.invalid", work_url: "example.com/work", hiring_projects: "Music videos and live performances", username: "avery_quinn", date_of_birth: "1990-10-02", avatar_url: "https://example.supabase.co/storage/v1/object/public/avatars/user/photo.jpg", acquisition_source: "event", acquisition_source_detail: "Dance event" };
test("auth destinations preserve local deep links and reject off-site URLs and auth loops", () => {
  for (const unsafe of ["https://evil.example", "//evil.example", "/\\evil.example", "/%2fhost/path", "/%5cevil.example", "/path\nInjected", "/%0d%0aHost", "/login", "/auth/callback?code=x", "/signup/check-email"]) assert.equal(safeAuthReturnPath(unsafe), null, unsafe);
  assert.equal(safeAuthReturnPath("/casting/casting-1?role=role-1&apply=1"), "/casting/casting-1?role=role-1&apply=1");
  assert.equal(safeAuthReturnPath("/projects/project-1#schedule"), "/projects/project-1#schedule");
});
test("callback authority ignores forged proxy hosts while retaining localhost and configured deployment", () => {
  assert.equal(resolveAuthCallbackOrigin("http://localhost:3001", "www.motiion.app", "https://www.motiion.app"), "http://localhost:3001");
  assert.equal(resolveAuthCallbackOrigin("https://www.motiion.app", "evil.example", "https://www.motiion.app"), "https://www.motiion.app");
  assert.equal(resolveAuthCallbackOrigin("http://internal:3000", "www.motiion.app", "https://www.motiion.app"), "https://www.motiion.app");
});
test("resend cooldown expires exactly and is bounded after clock changes", () => {
  assert.equal(resendSecondsRemaining(1_000, 1_000), 60);
  assert.equal(resendSecondsRemaining(1_000, 60_999), 1);
  assert.equal(resendSecondsRemaining(1_000, 61_000), 0);
  assert.equal(resendSecondsRemaining(null), 0);
  assert.equal(resendSecondsRemaining(Number.NaN), 0);
  assert.equal(resendSecondsRemaining(100_000, 1), 60);
});
test("expired and other-browser links provide usable recovery", () => {
  assert.match(authLinkErrorMessage("otp_expired"), /expired or has already been used/);
  assert.match(authLinkErrorMessage("bad_code_verifier"), /Log in here/);
  assert.match(authLinkErrorMessage(null), /request another link/);
});
test("industry identity is required before submission but later-step fields do not block the first step", () => {
  assert.equal(validateIndustryApplicationStep("review", application), null);
  assert.equal(validateIndustryApplicationStep("identity", { ...application, professional_role: "", acquisition_source: "", hiring_projects: "" }), null);
  for (const key of ["full_name", "username", "date_of_birth", "avatar_url"] as const) assert.ok(validateIndustryApplicationStep("identity", { ...application, [key]: "" }));
  assert.ok(validateIndustryApplicationStep("review", { ...application, acquisition_source: "not-an-option" }));
  assert.ok(validateIndustryApplicationStep("identity", { ...application, date_of_birth: "2020-02-30" }));
  assert.equal(validateIndustryApplicationStep("identity", { ...application, date_of_birth: "2008-11-02" }, new Date(2026, 10, 2)), null);
  assert.ok(validateIndustryApplicationStep("identity", { ...application, date_of_birth: "2008-11-03" }, new Date(2026, 10, 2)));
});
test("professional links accept bare domains without admitting script or credential URLs", () => {
  assert.equal(normalizeIndustryWorkUrl(" example.com/work "), "https://example.com/work");
  assert.equal(normalizeIndustryWorkUrl(""), "");
  for (const work_url of ["javascript:alert(1)", "https://name:password@example.com", "not a url", "https://exa mple.com"]) assert.ok(validateIndustryApplicationStep("work", { ...application, work_url }));
});
test("application drafts retain uploads and steps only for the same account and application version", () => {
  const raw = JSON.stringify({ userId: "one", applicationVersion: 2, step: "projects", details: application });
  assert.deepEqual(parseIndustryApplicationDraft(raw, "one", 2), { step: "projects", details: application });
  assert.equal(parseIndustryApplicationDraft(raw, "two", 2), null);
  assert.equal(parseIndustryApplicationDraft(raw, "one", 3), null);
  assert.equal(parseIndustryApplicationDraft("invalid JSON", "one", 2), null);
  assert.equal(parseIndustryApplicationDraft(JSON.stringify({ userId: "one", applicationVersion: 2, step: "projects", details: {} }), "one", 2), null);
});
test("profile bootstrap does not turn lookup failures into profile writes", async () => {
  let writes = 0;
  const db = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: "temporary unavailable" } }) }) }), upsert: () => { writes++; return {}; } }) };
  await assert.rejects(() => ensureOAuthProfile(db as never, { id: "one", user_metadata: {} } as never, { flow: "signup", accountType: "talent" }), /Could not load/);
  assert.equal(writes, 0);
});
test("profile bootstrap preserves completed profiles and uses conflict-safe creation", async () => {
  let writes = 0;
  const existingDb = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { user_id: "one", onboarding_completed_at: "2026-01-01" }, error: null }) }) }), upsert: () => { writes++; return {}; } }) };
  assert.deepEqual(await ensureOAuthProfile(existingDb as never, { id: "one" } as never, { flow: "signup", accountType: "talent" }), { created: false });
  assert.equal(writes, 0);
  const newDb = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }), upsert: async (_data: unknown, options: unknown) => { assert.deepEqual(options, { onConflict: "user_id", ignoreDuplicates: true }); writes++; return { error: null }; } }) };
  await ensureOAuthProfile(newDb as never, { id: "one", user_metadata: {}, email: "test@example.invalid" } as never, { flow: "signup", accountType: "talent" });
  assert.equal(writes, 1);
});

test("email change status keeps the verified address until both confirmations complete", () => {
  assert.deepEqual(emailChangeStatus({ email: "current@example.invalid", new_email: "new@example.invalid", email_confirmed_at: "2026-01-01" }), { currentEmail: "current@example.invalid", pendingEmail: "new@example.invalid", verified: true });
  assert.deepEqual(emailChangeStatus({ email: "new@example.invalid", new_email: "", email_confirmed_at: "2026-01-01" }), { currentEmail: "new@example.invalid", pendingEmail: null, verified: true });
  assert.deepEqual(emailChangeStatus(null), { currentEmail: null, pendingEmail: null, verified: false });
});
test("email-change recovery stays distinct from signup and safely encodes provider errors", () => {
  assert.equal(emailChangeFailurePath(), "/auth/email-change");
  assert.equal(emailChangeFailurePath("otp_expired&next=https://evil.example"), "/auth/email-change?error=otp_expired%26next%3Dhttps%3A%2F%2Fevil.example");
});

test("OAuth cancellation and email actions return to their own recovery routes", () => {
  assert.equal(authCallbackFailurePath("access_denied"), "/login?error=access_denied");
  assert.equal(authCallbackFailurePath("otp_expired", "recovery"), "/forgot-password?error=otp_expired");
  assert.equal(authCallbackFailurePath("otp_expired", "email_change"), "/auth/email-change?error=otp_expired");
  assert.equal(authCallbackFailurePath("otp_expired"), "/auth/link-error?error=otp_expired");
});

test('OAuth errors recover through sign-in rather than email confirmation',()=>{
 assert.equal(authCallbackFailurePath('unexpected_failure'),'/login?error=unexpected_failure');
 assert.equal(authCallbackFailurePath('bad_code_verifier','oauth'),'/login?error=bad_code_verifier');
 assert.equal(authCallbackFailurePath('unexpected_failure','recovery'),'/forgot-password?error=unexpected_failure');
});
