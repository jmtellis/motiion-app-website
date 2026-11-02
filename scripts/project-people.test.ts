import test from "node:test";
import assert from "node:assert/strict";
import { mergeProjectPeople } from "../src/lib/talent-buyers/project-roster-model";
test("canonical membership wins over saved-list duplicates", () => { const person = { userId: "u1", profileId: "p1", name: "Canonical", removed: false }; assert.deepEqual(mergeProjectPeople([person], [{ userId: "u1", profileId: "p1", name: "Old" }]).map((p) => p.name), ["Canonical"]); });
test("removal does not resurrect an old list entry", () => { assert.deepEqual(mergeProjectPeople([{ userId: "u1", profileId: "p1", removed: true }], [{ userId: "u1", profileId: "p1" }]), []); });
test("unmatched legacy people are retained once, missing profiles do not collapse canonical people", () => { assert.equal(mergeProjectPeople<{ userId: string | null; profileId: string }>([{ userId: "u1", profileId: "u1", removed: false }, { userId: "u2", profileId: "u2", removed: false }], [{ userId: null, profileId: "p1" }, { userId: null, profileId: "p1" }]).length, 3); });
