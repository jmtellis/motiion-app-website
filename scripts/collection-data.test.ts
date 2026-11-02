import assert from "node:assert/strict";
import { test } from "node:test";
import { readPagedRows } from "../src/lib/supabase/read-pages.ts";

test("loads a roster beyond the backend default cap without losing members", async () => {
  const members = Array.from({ length: 1251 }, (_, id) => ({ id }));
  const calls: number[][] = [];
  const result = await readPagedRows((from, to) => { calls.push([from, to]); return Promise.resolve({ data: members.slice(from, to + 1), error: null }); });
  assert.equal(result.error, null);
  assert.deepEqual(result.data, members);
  assert.equal(calls.length, 6);
});
test("a later page failure does not return a partial roster as complete", async () => {
  const result = await readPagedRows((from) => Promise.resolve(from ? { data: null, error: { message: "Permission changed" } } : { data: [1,2], error: null }), { pageSize: 2 });
  assert.equal(result.data, null);
  assert.equal(result.error?.message, "Permission changed");
});
test("large load guard explicitly reports truncation and accepts exact boundary", async () => {
  const fetch = (values: number[]) => (from: number, to: number) => Promise.resolve({ data: values.slice(from, to + 1), error: null });
  assert.equal((await readPagedRows(fetch([1,2,3]), {pageSize:2,maxRows:2})).data, null);
  assert.deepEqual((await readPagedRows(fetch([1,2]), {pageSize:2,maxRows:2})).data, [1,2]);
});
test("network rejection and empty collections are distinct", async () => {
  assert.deepEqual(await readPagedRows(() => Promise.resolve({data:[],error:null})), {data:[],error:null});
  const failure = await readPagedRows(() => Promise.reject(new Error("offline")));
  assert.equal(failure.data, null);
  assert.match(failure.error!.message, /connection/);
});

import { isPublicCollectionAccount } from "../src/lib/talent-buyers/collection-public-people.ts";
test("public roster links exclude private, suspended and missing accounts", () => {
  assert.equal(isPublicCollectionAccount({ is_private: false, moderation_status: "active" }), true);
  assert.equal(isPublicCollectionAccount({ is_private: null, moderation_status: null }), true);
  assert.equal(isPublicCollectionAccount({ is_private: true }), false);
  assert.equal(isPublicCollectionAccount({ is_private: false, moderation_status: "suspended" }), false);
  assert.equal(isPublicCollectionAccount(null), false);
  assert.equal(isPublicCollectionAccount(undefined), false);
});
