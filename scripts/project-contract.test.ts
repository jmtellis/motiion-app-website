import assert from "node:assert/strict";
import test from "node:test";
import { normalizeProjectContract } from "../src/lib/talent-buyers/project-contract";
import { isComposableProject, resolveProjectAbilities } from "../src/lib/talent-buyers/project-abilities";
import { parseComposableProjectShell } from "../src/lib/talent-buyers/composable-project-schema";
test("current iOS project columns become a usable web project without rewriting its data", () => {
  const row = { is_composable: true, is_active: true, project_abilities: [{ ability: "casting" }, { ability: "roster" }], project_configuration: { create_request_id: "request", attachments: [] } };
  const normalized = normalizeProjectContract(row);
  assert(isComposableProject(normalized));
  assert.deepEqual(resolveProjectAbilities(normalized), [{ id: "casting", status: "active" }, { id: "roster", status: "active" }]);
  assert.equal(normalized.project_configuration.create_request_id, "request");
  assert.equal("composable" in row.project_configuration, false);
});
test("canonical removed abilities do not reappear from stale legacy flags", () => {
  const normalized = normalizeProjectContract({ is_composable: true, is_active: true, project_abilities: [], enabled_modules: { casting: true, roster: true } });
  assert.deepEqual(resolveProjectAbilities(normalized), []);
});
test("web pause remains recoverable; iOS reenable removes the stale pause", () => {
  const row = { is_composable: true, project_configuration: { composable: { version: 1, paused: ["casting"] } }, project_abilities: [] as { ability: string }[] };
  assert.deepEqual(resolveProjectAbilities(normalizeProjectContract(row)), [{ id: "casting", status: "paused" }]);
  assert.deepEqual(resolveProjectAbilities(normalizeProjectContract({ ...row, project_abilities: [{ ability: "casting" }] })), [{ id: "casting", status: "active" }]);
});
test("legacy web projects still open; canonical archive and restore reflect is_active", () => {
  const legacy = { project_configuration: { composable: { version: 1, paused: [], archived_at: null } }, enabled_modules: { casting: true } };
  assert.equal(normalizeProjectContract(legacy), legacy);
  const archive = normalizeProjectContract({ ...legacy, is_composable: true, is_active: false, updated_at: "2026-11-02T00:00:00Z", project_abilities: [] });
  assert.equal(archive.project_configuration.composable.archived_at, "2026-11-02T00:00:00Z");
  assert.equal(normalizeProjectContract({ ...archive, is_active: true }).project_configuration.composable.archived_at, null);
});
test("project creation accepts a retry identity and rejects impossible dates", () => {
  const requestId = "f95d0b39-df48-4c1b-b2f2-eb9c46caa419";
  const result = parseComposableProjectShell({ name: "Production", requestId, startDate: "2026-11-02" });
  assert(result.success); assert.equal(result.data.requestId, requestId);
  assert.equal(parseComposableProjectShell({ name: "Production", startDate: "2026-02-30" }).success, false);
});
