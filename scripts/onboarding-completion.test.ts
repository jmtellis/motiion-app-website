import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { z } from "zod";
import * as profileHelpers from "../src/lib/auth/profile";
import { getBirthDateAge } from "../src/lib/onboarding/birth-date";

const source = readFileSync(new URL("../src/app/onboarding/actions.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const id = "11111111-1111-4111-8111-111111111111";
const payload = { version: 1, userId: id, currentStep: "accountCreated", firstName: "Test", lastName: "Member", email: "member@example.invalid", dateOfBirth: "1995-01-02", notificationsEnabled: true, role: "community", accountType: "community", displayName: "Test Member", username: "test_member", acquisitionSource: "other" };

function fixture(accountType: string, completedAt: string | null = "2026-01-02T00:00:00Z") {
  const writes: Record<string, unknown>[] = [];
  const metadata: Record<string, unknown>[] = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id, email: payload.email } } }), updateUser: async (value: Record<string, unknown>) => { metadata.push(value); return { error: null }; } },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { account_type: accountType, onboarding_completed_at: completedAt }, error: null }) }) }),
      upsert: async (value: Record<string, unknown>) => { writes.push(value); return { error: null }; },
    }),
    rpc: async () => ({ data: true, error: null }),
  };
  const modules: Record<string, unknown> = {
    "@/lib/billing/account-deletion": {}, "@/lib/onboarding/birth-date": { getBirthDateAge },
    "@/lib/auth/pending-return": { consumeAuthReturn: async () => "/activity/intended-class" },
    "next/cache": { revalidatePath: () => {} }, zod: { z },
    "@/lib/auth/profile": profileHelpers,
    "@/lib/auth/session": { getProfileDestination: profileHelpers.getProfileDestination },
    "@/lib/analytics/track-server": { trackServerEvent: async () => {} },
    "@/lib/professional-profile/actions": {}, "@/lib/professional-profile/sync": { syncProfessionalProfile: async () => {} },
    "@/lib/supabase/server": { createServerSupabaseClient: async () => client },
  };
  const exports: { completeOnboarding?: (value: unknown) => Promise<{ ok: boolean; redirectTo?: string }> } = {};
  new Function("require", "exports", compiled)((name: string) => { if (!(name in modules)) throw new Error(`Unexpected dependency ${name}`); return modules[name]; }, exports);
  return { complete: exports.completeOnboarding!, writes, metadata };
}

test("a timestamp on an unsupported legacy role cannot falsely complete new onboarding", async () => {
  const f = fixture("dancer");
  assert.deepEqual(await f.complete(payload), { ok: true, redirectTo: "/activity/intended-class" });
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].account_type, "community");
  assert.equal(f.writes[0].username, "test_member");
  assert.deepEqual(f.writes[0].enabled_shells, ["community"]);
  assert.equal(f.writes[0].active_shell, "community");
  assert.equal((f.metadata[0].data as Record<string, unknown>).account_type, "community");
});

test("completed supported consumer accounts keep their saved profile on replay", async () => {
  for (const role of ["talent", "community"]) {
    const f = fixture(role);
    assert.equal((await f.complete(payload)).ok, true);
    assert.deepEqual(f.writes, []);
    assert.deepEqual(f.metadata, []);
  }
});

test("adding a talent shell preserves industry identity and cannot convert it to community", async () => {
  const rejected = fixture("lookingForTalent");
  assert.equal((await rejected.complete(payload)).ok, false);
  assert.deepEqual(rejected.writes, []);
  const added = fixture("lookingForTalent");
  assert.equal((await added.complete({ ...payload, role: "talent", accountType: "talent", talentTypes: ["dancer"], headshotUrls: ["https://example.invalid/headshot.jpg"] })).ok, true);
  assert.equal(added.writes[0].account_type, "lookingForTalent");
  assert.equal((added.metadata[0].data as Record<string, unknown>).account_type, undefined);
});
