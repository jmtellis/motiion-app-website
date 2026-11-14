import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeProjectSettings, projectSettingsSchema } from "../src/lib/talent-buyers/project-settings";
import type { ProjectRecord } from "../src/types/project";
const input = {
  title: "New title", description: "New description", productionCompany: "Client", productionCompanyLogoUrl: "",
  location: "Los Angeles", coverImageUrl: "", startDate: "2026-11-11", endDate: "2026-11-11", datesNotConfirmed: false,
  scheduleCategories: [{ id_key: "rehearsal", activity_type_raw: "Rehearsal", selected_days_yyyymmdd: ["2026-11-11"], start_time_by_day: { "2026-11-11": "09:00" } }],
};
test("project settings preserve app-only details and per-day schedule metadata", () => {
  const project = { title: "Old title", project_details: { rate_type: "fixed", rate_details: { fixed_amount: 500 }, confidential_client: true, casting_kinds: ["commercial"], is_union: true } } as unknown as ProjectRecord;
  const result = mergeProjectSettings(project, projectSettingsSchema.parse(input));
  assert.equal(result.title, "New title");
  assert.deepEqual(result.rate_details, { fixed_amount: 500 });
  assert.equal(result.confidential_client, true);
  assert.equal(result.is_union, true);
  assert.deepEqual(result.schedule_categories[0].start_time_by_day, { "2026-11-11": "09:00" });
});
test("settings accept both app date encodings and reject invalid bounds or long titles", () => {
  assert.equal(projectSettingsSchema.safeParse(input).success, true);
  assert.equal(projectSettingsSchema.safeParse({ ...input, scheduleCategories: [{ ...input.scheduleCategories[0], selected_days_yyyymmdd: ["20261111"] }] }).success, true);
  assert.equal(projectSettingsSchema.safeParse({ ...input, title: "x".repeat(121) }).success, false);
  assert.equal(projectSettingsSchema.safeParse({ ...input, endDate: "2026-11-10" }).success, false);
});
