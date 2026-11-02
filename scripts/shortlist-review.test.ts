import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { shortlistInstagramUrl, groupShortlistByRole } from "../src/lib/shortlist-review.ts";
import type { PublicShortlistSubmission } from "../src/types/publicShortlist";

test("Instagram links accept handles and Instagram only", () => {
  assert.equal(shortlistInstagramUrl("@dancer.name"), "https://www.instagram.com/dancer.name/");
  assert.equal(shortlistInstagramUrl("instagram.com/dancer"), "https://instagram.com/dancer");
  for (const input of ["javascript:alert(1)", "https://evil.com/a", "https://instagram.com.evil.com/a", "https://evil@instagram.com/a", ""]) assert.equal(shortlistInstagramUrl(input), null);
});
test("roles with the same title stay separate, including repeated talent", () => {
  const groups = groupShortlistByRole([
    { id: "a", talentId: "same", roleId: "role-a", roleTitle: "Dancer" },
    { id: "b", talentId: "same", roleId: "role-b", roleTitle: "Dancer" },
  ] as PublicShortlistSubmission[], "Fallback");
  assert.equal(groups.length, 2);
  assert.equal(groups[1].submissions[0].id, "b");
});

// Exercise the actual Edge Function handler with a deterministic database adapter.
const source = readFileSync(new URL("../../motiion-app-ios/supabase/functions/shortlist-share-public/index.ts", import.meta.url), "utf8").replace(/^import .*;\n/gm, "");
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
const reviewId = "1f845b19-bae0-4711-96d2-1e51a7ff83a4";
function server(options: { expired?: boolean; foreign?: boolean; failVotes?: boolean } = {}) {
  let handler: (request: Request) => Promise<Response>;
  const written: unknown[] = [];
  const people = new Map<string, Record<string, unknown>>();
  const share = { id: "share", role_id: "lead", role_ids: ["lead", "ensemble"], title: "Campaign", roles: { title: "Lead", production: "Project" }, expires_at: options.expired ? "2020-01-01" : null };
  const database = { from(table: string) {
    const filters: Record<string, unknown> = {};
    let write: Record<string, unknown> | undefined;
    const query = {
      select() { return query; }, eq(key: string, value: unknown) { filters[key] = value; return query; },
      in(key: string, value: unknown) { filters[key] = value; return query; }, order() { return query; },
      upsert(value: Record<string, unknown>) { write = value; return query; }, single() { return query; }, maybeSingle() { return query; },
      then(resolve: (result: unknown) => void) {
        if (table === "profiles") return Promise.resolve(resolve({ data: { display_name: "Casting team", industry_avatar_url: null } }));
        if (table === "casting_shortlist_shares") return Promise.resolve(resolve({ data: share }));
        if (table === "submissions") {
          const roleIds = filters.role_id as string[];
          const all = [{ id: "a", role_id: "lead", roles: { title: "Lead" }, talent: { full_name: "A", instagram_url: "@a" } }, { id: "b", role_id: "ensemble", roles: { title: "Ensemble" }, talent: { full_name: "B" } }];
          return Promise.resolve(resolve({ data: all.filter((row) => roleIds.includes(row.role_id) && (!filters.id || (filters.id as string[]).includes(row.id))) }));
        }
        if (table === "casting_shortlist_share_recipients") {
          if (write && !people.has(String(write.id))) people.set(String(write.id), options.foreign ? { ...write, share_id: "other" } : write);
          const person = people.get(String(filters.id));
          return Promise.resolve(resolve({ data: write ? null : person?.share_id === filters.share_id ? person : null }));
        }
        if (table === "casting_shortlist_share_votes") { if (!options.failVotes) written.push(write); return Promise.resolve(resolve({ error: options.failVotes ? { message: "unavailable" } : null })); }
        throw new Error(table);
      },
    }; return query;
  }, rpc: async () => ({ error: null }) };
  vm.runInNewContext(code, { serve: (fn: typeof handler) => { handler = fn; }, createClient: () => database, Deno: { env: { get: () => "test" } }, Response, console, crypto: globalThis.crypto });
  return { written, people, async request(body: object) { const response = await handler(new Request("https://test", { method: "POST", body: JSON.stringify({ token: "test", ...body }) })); return { status: response.status, data: await response.json() }; } };
}
const valid = { action: "submit", recipientId: reviewId, reviewerName: "Alex Client", votes: [{ submissionId: "a", vote: "yes" }, { submissionId: "b", vote: "no" }] };
test("public payload preserves role and Instagram, hides reviewer identities", async () => {
  const result = await server().request({});
  assert.equal(result.status, 200);
  assert.equal(result.data.submissions[1].roleTitle, "Ensemble");
  assert.equal(result.data.submissions[0].instagramUrl, "@a");
  assert.deepEqual(result.data.recipients, []);
  assert.equal(result.data.share.sharedBy.name, "Casting team");
});
test("named reviews save votes across all roles and retries reuse reviewer", async () => {
  const api = server();
  assert.equal((await api.request(valid)).data.submittedCount, 2);
  assert.equal((await api.request(valid)).status, 200);
  assert.equal(api.people.size, 1);
  assert.equal(api.people.get(reviewId)?.display_name, "Alex Client");
});
test("reject blank names, malformed votes, duplicates, and out-of-share submissions without writes", async () => {
  for (const override of [{ reviewerName: " " }, { votes: [{ submissionId: "a", vote: "maybe" }] }, { votes: [valid.votes[0], valid.votes[0]] }, { votes: [...valid.votes, { submissionId: "foreign", vote: "yes" }] }]) {
    const api = server();
    assert.equal((await api.request({ ...valid, ...override })).status, 400);
    assert.equal(api.written.length, 0);
    assert.equal(api.people.size, 0);
  }
});
test("expired links and foreign reviewer IDs cannot write votes", async () => {
  const expired = server({ expired: true });
  assert.equal((await expired.request(valid)).status, 410);
  assert.equal(expired.written.length, 0);
  const foreign = server({ foreign: true });
  assert.equal((await foreign.request(valid)).status, 403);
  assert.equal(foreign.written.length, 0);
});
test("database failures never report success", async () => {
  assert.equal((await server({ failVotes: true }).request(valid)).status, 500);
});
