import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readWorkspaceProjects } from "../src/lib/talent-buyers/project-workspace-read";

function session(userId: string | null, ids: string[], error: { message: string } | null = null) {
  let filter: string | undefined;
  const query = {
    eq: (_: string, id: string) => { filter = id; return query; },
    order: () => query,
    range: () => Promise.resolve({ data: ids.filter((id) => !filter || id === filter).map((id) => ({ id })), error }),
  };
  return { auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }) }, rpc: () => query } as unknown as SupabaseClient;
}

test("a supplied user ID or inaccessible project cannot authorize hydration", async () => {
  const reader = () => { throw new Error("privileged read must not run"); };
  assert.deepEqual(await readWorkspaceProjects(session("member", ["shared"]), reader, "owner", "shared"), []);
  assert.deepEqual(await readWorkspaceProjects(session(null, ["shared"]), reader, "member", "shared"), []);
  assert.deepEqual(await readWorkspaceProjects(session("member", ["shared"]), reader, "member", "foreign"), []);
});

test("membership failures remain errors and never fall through to privileged reads", async () => {
  await assert.rejects(() => readWorkspaceProjects(session("member", [], { message: "network" }), () => { throw new Error("must not run"); }, "member"), /check access/);
});

test("only canonical membership IDs are hydrated and canonical abilities are retained", async () => {
  const queried: string[][] = [];
  const reader = { from: () => ({ select: () => ({ in: async (_: string, ids: string[]) => {
    queried.push(ids);
    return { data: ids.map((id) => ({ id, is_composable: true, project_abilities: [{ ability: "casting" }] })), error: null };
  } }) }) } as unknown as SupabaseClient;
  const rows = await readWorkspaceProjects(session("member", ["shared", "shared", "other"]), () => reader, "member", "shared");
  assert.deepEqual(queried, [["shared"]]);
  assert.equal(rows[0].enabled_modules?.casting, true);
});
