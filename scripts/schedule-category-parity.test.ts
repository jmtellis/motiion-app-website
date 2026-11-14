import assert from "node:assert/strict";
import { test } from "node:test";
import { buildScheduleConfigurationPatch, getScheduleCategoryDrafts } from "../src/lib/talent-buyers/casting/casting-schedule";
import type { CastingComposerForm, CastingScheduleCategoryCodable } from "../src/types/casting";

test("editing web schedule dates preserves iOS times, locations and group audiences", () => {
  const category: CastingScheduleCategoryCodable = {
    id_key: "rehearsal", activity_type_raw: "Rehearsal",
    selected_days_yyyymmdd: ["2026-11-10", "2026-11-11"],
    applies_to_group_ids: ["group-1"], applies_to_group_ids_by_day: { "2026-11-10": ["group-2"] },
    start_time_by_day: { "2026-11-10": "18:30:00", "2026-11-11": "09:00:00" },
    end_time_by_day: { "2026-11-10": "20:00:00" }, location_by_day: { "2026-11-10": "Studio B" },
  };
  const form = { configuration: { schedule_categories: [category] } } as CastingComposerForm;
  const drafts = getScheduleCategoryDrafts(form);
  drafts[0].selected_days_iso = ["2026-11-10"];
  const [saved] = buildScheduleConfigurationPatch({ scheduleCategoryDrafts: drafts }).schedule_categories!;
  assert.deepEqual(saved.start_time_by_day, { "2026-11-10": "18:30:00" });
  assert.deepEqual(saved.end_time_by_day, category.end_time_by_day);
  assert.deepEqual(saved.location_by_day, category.location_by_day);
  assert.deepEqual(saved.applies_to_group_ids, category.applies_to_group_ids);
  assert.deepEqual(saved.applies_to_group_ids_by_day, category.applies_to_group_ids_by_day);
});
