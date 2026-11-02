import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { NextRequest, NextResponse } from "next/server";
import { safeAuthReturnPath } from "../src/lib/auth/redirects";

const source = readFileSync(new URL("../src/app/auth/continue/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

async function continueRequest(profile: { id: string; complete: boolean } | null, next: string) {
  const modules: Record<string, unknown> = {
    "next/server": { NextResponse },
    "@/lib/auth/session": { getCurrentUserProfile: async () => profile, getProfileDestination: () => profile?.complete ? "/home" : "/onboarding" },
    "@/lib/auth/profile": { isOnboardingComplete: () => profile?.complete },
    "@/lib/auth/pending-return": { AUTH_RETURN_COOKIE: "motiion-auth-return", serializeAuthReturn: (userId: string, path: string) => JSON.stringify({ userId, path }) },
    "@/lib/auth/redirects": { safeAuthReturnPath },
  };
  const exports: { GET?: (request: NextRequest) => Promise<NextResponse> } = {};
  new Function("require", "exports", compiled)((name: string) => {
    if (!(name in modules)) throw new Error(`Unexpected dependency ${name}`);
    return modules[name];
  }, exports);
  return exports.GET!(new NextRequest(`https://www.motiion.app/auth/continue?next=${encodeURIComponent(next)}`));
}

test("an incomplete authenticated account keeps its own safe destination through setup", async () => {
  const response = await continueRequest({ id: "current-user", complete: false }, "/activity/class-one?register=1");
  assert.equal(response.headers.get("location"), "https://www.motiion.app/onboarding");
  const cookie = response.cookies.get("motiion-auth-return");
  assert.deepEqual(JSON.parse(cookie!.value), { userId: "current-user", path: "/activity/class-one?register=1" });
  assert.match(response.headers.get("set-cookie") ?? "", /HttpOnly/);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("completed accounts continue directly, while off-site destinations are ignored", async () => {
  const completed = await continueRequest({ id: "current-user", complete: true }, "/activity/class-one");
  assert.equal(completed.headers.get("location"), "https://www.motiion.app/activity/class-one");
  assert.equal(completed.cookies.get("motiion-auth-return"), undefined);
  const rejected = await continueRequest({ id: "current-user", complete: false }, "//example.com/steal");
  assert.equal(rejected.headers.get("location"), "https://www.motiion.app/onboarding");
  assert.equal(rejected.cookies.get("motiion-auth-return"), undefined);
});

test("an absent session returns to login without writing another account's return state", async () => {
  const response = await continueRequest(null, "/activity/class-one?register=1");
  assert.equal(response.headers.get("location"), "https://www.motiion.app/login?next=%2Factivity%2Fclass-one%3Fregister%3D1");
  assert.equal(response.cookies.get("motiion-auth-return"), undefined);
});
