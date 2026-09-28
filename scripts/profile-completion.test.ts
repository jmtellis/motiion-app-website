import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { reorderHeadshots } from "../src/lib/onboarding/reorder-headshots.ts";
import { styleOptions, skillOptions, genderOptions, ethnicityOptions, hairColorOptions, eyeColorOptions } from "../src/lib/onboarding/profile-options.ts";

test("moving a primary headshot preserves the original image association", () => {
  assert.deepEqual(reorderHeadshots(["a", "b", "c"], ["A", "B", "C"], 2, 0), {
    headshotUrls: ["c", "a", "b"], headshotOriginalUrls: ["C", "A", "B"],
  });
});
test("legacy profiles without originals can reorder without empty URLs", () => {
  assert.deepEqual(reorderHeadshots(["a", "b", "c"], ["A"], 0, 2), {
    headshotUrls: ["b", "c", "a"], headshotOriginalUrls: ["b", "c", "A"],
  });
});
test("web selection catalogs match the shipped iOS catalogs", () => {
  const base = new URL("../../motiion-app-ios/Motiion/Models/", import.meta.url);
  const experience = readFileSync(new URL("OnboardingExperienceOptions.swift", base), "utf8");
  const enums = readFileSync(new URL("ProfileEnums.swift", base), "utf8");
  for (const [name, options] of [["danceStyles", styleOptions], ["skills", skillOptions]] as const) {
    const block = experience.split(`static let ${name}: [String] = [`)[1].split("]")[0];
    assert.deepEqual(options, Array.from(block.matchAll(/"([^"]+)"/g), match => match[1]));
  }
  for (const [name, options] of [["Gender", genderOptions], ["Ethnicity", ethnicityOptions], ["HairColor", hairColorOptions], ["EyeColor", eyeColorOptions]] as const) {
    const block = enums.split(`enum ${name}:`)[1].split("var displayName")[0];
    assert.deepEqual(options, Array.from(block.matchAll(/case \w+ = "([^"]+)"/g), match => match[1]));
  }
});
