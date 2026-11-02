import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCastingSubmissionMaterials, readCastingSubmissionDraft, writeCastingSubmissionDraft, clearCastingSubmissionDraft } from "../src/lib/casting/submission-materials";

test("required slate and role link limits produce actionable validation", () => {
  assert.equal(normalizeCastingSubmissionMaterials({ slateRequired: true, maxLinks: 2 }).ok, false);
  assert.equal(normalizeCastingSubmissionMaterials({ slate: "javascript:alert(1)", slateRequired: true, maxLinks: 2 }).ok, false);
  assert.equal(normalizeCastingSubmissionMaterials({ slate: "https://example.test/slate", links: "https://example.test/a\nhttps://example.test/b", slateRequired: true, maxLinks: 1 }).ok, false);
  assert.equal(normalizeCastingSubmissionMaterials({ links: "not a link", slateRequired: false, maxLinks: 2 }).ok, false);
  assert.equal(normalizeCastingSubmissionMaterials({ links: "https://example.test/work", slateRequired: false, maxLinks: 0 }).ok, false);
});
test("optional materials remain optional and valid links are normalized without duplication", () => {
  assert.deepEqual(normalizeCastingSubmissionMaterials({ slateRequired: false, maxLinks: 0 }), { ok: true, slate: null, links: [] });
  assert.deepEqual(normalizeCastingSubmissionMaterials({ slate: " https://example.test/slate ", links: "https://example.test/work\r\n\nhttps://example.test/work", slateRequired: true, maxLinks: 1 }), { ok: true, slate: "https://example.test/slate", links: ["https://example.test/work"] });
});
test("submission drafts survive interrupted work but never cross accounts or roles", () => {
  const map = new Map<string,string>(); const storage = { getItem: (key:string) => map.get(key) ?? null, setItem:(key:string,value:string) => {map.set(key,value);},removeItem:(key:string) => {map.delete(key);} };
  const draft = { note:"Keep this on retry", answers:{availability:"Available"}, slate:"https://example.test/slate", links:"https://example.test/work" };
  writeCastingSubmissionDraft(storage, "talent", "role-a", draft);
  assert.deepEqual(readCastingSubmissionDraft(storage, "talent", "role-a"), draft);
  assert.equal(readCastingSubmissionDraft(storage, "other", "role-a").note, "");
  assert.equal(readCastingSubmissionDraft(storage, "talent", "role-b").note, "");
  clearCastingSubmissionDraft(storage, "talent", "role-a");
  assert.equal(readCastingSubmissionDraft(storage, "talent", "role-a").note, "");
  assert.equal(readCastingSubmissionDraft(null, "talent", "role-a").note, "");
});
