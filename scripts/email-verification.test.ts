import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { NextRequest, NextResponse } from "next/server";
import { safeAuthReturnPath } from "../src/lib/auth/redirects";
import { resolveSignupIntent } from "../src/lib/auth/oauth-shared";

const compiled = ts.transpileModule(readFileSync(new URL("../src/app/auth/verify-code/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const user = { id: "verified-user", email: "test@example.invalid", email_confirmed_at: "2026-11-15", user_metadata: { motiion_account_type: "lookingForTalent", motiion_return_to: "/casting/one?apply=1" } };
async function request(options: { body?: unknown; origin?: string; invalid?: boolean; current?: typeof user; destination?: string; setupFails?: boolean } = {}) {
  let attempts = 0;
  let setupCalls = 0;
  const db = { auth: {
    getUser: async () => ({ data: { user: options.current ?? null } }),
    verifyOtp: async (input: unknown) => { attempts++; assert.deepEqual(input, { email: user.email, token: "123456", type: "signup" }); return options.invalid ? { data: {}, error: { status: 403 } } : { data: { user, session: {} }, error: null }; },
  } };
  const modules: Record<string, unknown> = {
    "next/server": { NextResponse },
    "@/lib/supabase/server": { createServerSupabaseClient: async () => db },
    "@/lib/auth/oauth-server": { ensureOAuthProfile: async (_db: unknown, verified: unknown, intent: { accountType: string }) => { setupCalls++; assert.equal(verified, user); assert.equal(intent.accountType, "lookingForTalent"); if (options.setupFails) throw new Error("temporary"); return { created: true }; }, resolveOAuthRedirectPath: async () => options.destination ?? "/talent-buyers/onboarding" },
    "@/lib/analytics/track-server": { trackServerEvent: async () => {} },
    "@/lib/auth/oauth-shared": { resolveSignupIntent },
    "@/lib/auth/redirects": { safeAuthReturnPath },
    "@/lib/auth/pending-return": { AUTH_RETURN_COOKIE: "motiion-auth-return", serializeAuthReturn: (userId: string, path: string) => JSON.stringify({ userId, path }) },
  };
  const exports: { POST?: (request: NextRequest) => Promise<NextResponse> } = {};
  new Function("require", "exports", compiled)((name: string) => { if (!(name in modules)) throw new Error(name); return modules[name]; }, exports);
  const response = await exports.POST!(new NextRequest("https://www.motiion.app/auth/verify-code", { method: "POST", headers: { origin: options.origin ?? "https://www.motiion.app", "Content-Type": "application/json" }, body: JSON.stringify(options.body ?? { email: user.email, code: "123456", next: "/activity/one?register=1" }) }));
  return { response, attempts, setupCalls, body: await response.json() };
}
test("code verification retains requested action through industry onboarding", async () => {
  const result = await request();
  assert.equal(result.response.status, 200);
  assert.equal(result.attempts, 1);
  assert.equal(result.body.destination, "/talent-buyers/onboarding");
  assert.deepEqual(JSON.parse(result.response.cookies.get("motiion-auth-return")!.value), { userId: user.id, path: "/activity/one?register=1" });
  assert.match(result.response.headers.get("set-cookie")!, /HttpOnly/);
  assert.equal(result.response.headers.get("cache-control"), "no-store");
});
test("completed accounts resume directly; metadata recovers missing and unsafe next paths", async () => {
  const direct = await request({ destination: "/home" });
  assert.equal(direct.body.destination, "/activity/one?register=1");
  for (const next of [undefined, "//evil.example", { invalid: true }]) {
    const result = await request({ body: { email: user.email, code: "123456", next }, destination: "/home" });
    assert.equal(result.body.destination, "/casting/one?apply=1");
  }
});
test("invalid and expired codes cannot create profiles or return cookies", async () => {
  const result = await request({ invalid: true });
  assert.equal(result.response.status, 400);
  assert.equal(result.setupCalls, 0);
  assert.equal(result.response.cookies.get("motiion-auth-return"), undefined);
});
test("cross-origin and malformed submissions do not contact verification", async () => {
  for (const options of [{ origin: "https://evil.example" }, { body: { email: user.email, code: "bad" } }, { body: null }]) {
    const result = await request(options.body === null ? { body: [] } : options);
    assert.ok(result.response.status >= 400);
    assert.equal(result.attempts, 0);
  }
});
test("setup failures can retry after consuming the code without verifying it twice", async () => {
  assert.equal((await request({ setupFails: true })).response.status, 503);
  const retry = await request({ current: user });
  assert.equal(retry.response.status, 200);
  assert.equal(retry.attempts, 0);
});
test("a different signed-in account cannot bypass the code", async () => {
  const result = await request({ current: { ...user, email: "another@example.invalid" }, invalid: true });
  assert.equal(result.attempts, 1);
  assert.equal(result.response.status, 400);
  assert.equal(result.setupCalls, 0);
});
