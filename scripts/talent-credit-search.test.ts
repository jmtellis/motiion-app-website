import assert from "node:assert/strict";
import test from "node:test";

import { normalizeIndustryEntityName } from "../src/lib/talent-navigator/normalize-entity-name.ts";
import {
  pickHighestVerification,
  scoreCreditMatch,
  VERIFICATION_WEIGHT,
} from "../src/lib/talent-navigator/ranking.ts";
import {
  mapNlParsedToNavigatorFilters,
  mergeNavigatorFilters,
} from "../src/lib/talent-navigator/parse-nl-query.ts";
import { EMPTY_NAVIGATOR_FILTERS } from "../src/lib/talent-navigator/types.ts";
import { TalentNavigatorSearchSchema } from "../src/lib/talent-navigator/credit-types.ts";
import { clampTalentVerification } from "../src/lib/talent-navigator/credit-management.ts";
import { extractedResumeToCreditProposals } from "../src/lib/talent-navigator/resume-credit-extraction.ts";
import {
  talentMatchesAllEntities,
  talentMatchesAnyEntity,
} from "../src/lib/talent-navigator/match-mode.ts";

test("normalizeIndustryEntityName folds diacritics and punctuation", () => {
  assert.equal(
    normalizeIndustryEntityName("  Beyoncé Knowles-Carter "),
    "beyonce knowles carter",
  );
  assert.equal(normalizeIndustryEntityName("Sean Bankhead"), "sean bankhead");
  assert.equal(normalizeIndustryEntityName("Renaissance World Tour"), "renaissance world tour");
});

test("verification weights rank Motiion verified highest", () => {
  assert.ok(VERIFICATION_WEIGHT.motiion_verified > VERIFICATION_WEIGHT.industry_confirmed);
  assert.ok(VERIFICATION_WEIGHT.industry_confirmed > VERIFICATION_WEIGHT.talent_reported);
  assert.equal(
    pickHighestVerification(["talent_reported", "motiion_verified", "unverified"]),
    "motiion_verified",
  );
});

test("scoreCreditMatch increases with matching credits and verification", () => {
  const weak = scoreCreditMatch({
    matchingCreditCount: 1,
    verificationStatuses: ["talent_reported"],
    latestCreditYear: 2015,
  });
  const strong = scoreCreditMatch({
    matchingCreditCount: 3,
    verificationStatuses: ["motiion_verified", "industry_confirmed"],
    latestCreditYear: 2024,
  });
  assert.ok(strong > weak);
});

test("mapNlParsedToNavigatorFilters extracts credit entities", () => {
  const filters = mapNlParsedToNavigatorFilters({
    artists: ["Beyoncé"],
    choreographers: ["Sean Bankhead"],
    productions: ["Renaissance World Tour"],
    relationshipMatchMode: "all",
    verificationStatuses: ["industry_confirmed", "motiion_verified"],
    location: "Los Angeles",
  });

  assert.deepEqual(filters.artists, ["Beyoncé"]);
  assert.deepEqual(filters.choreographers, ["Sean Bankhead"]);
  assert.deepEqual(filters.productions, ["Renaissance World Tour"]);
  assert.equal(filters.relationshipMatchMode, "all");
  assert.equal(filters.location, "Los Angeles");
});

test("mergeNavigatorFilters merges credit arrays and profile filters", () => {
  const merged = mergeNavigatorFilters(EMPTY_NAVIGATOR_FILTERS, {
    artists: ["Rihanna"],
    location: "New York",
    relationshipMatchMode: "any",
  });
  assert.deepEqual(merged.artists, ["Rihanna"]);
  assert.equal(merged.location, "New York");
  assert.equal(merged.relationshipMatchMode, "any");
});

test("TalentNavigatorSearchSchema defaults and all/any modes", () => {
  const parsed = TalentNavigatorSearchSchema.parse({
    artists: ["Beyoncé"],
    choreographers: ["Sean Bankhead"],
    relationshipMatchMode: "all",
  });
  assert.equal(parsed.relationshipMatchMode, "all");
  assert.equal(parsed.minimumMatchingCredits, 1);
  assert.equal(parsed.limit, 20);

  const anyMode = TalentNavigatorSearchSchema.parse({
    artists: ["Beyoncé", "Rihanna"],
    relationshipMatchMode: "any",
  });
  assert.equal(anyMode.relationshipMatchMode, "any");
});

test("clampTalentVerification blocks high-trust self assignment", () => {
  assert.equal(clampTalentVerification("motiion_verified"), "talent_reported");
  assert.equal(clampTalentVerification("industry_confirmed"), "talent_reported");
  assert.equal(clampTalentVerification("talent_reported"), "talent_reported");
  assert.equal(clampTalentVerification("ai_extracted"), "ai_extracted");
});

test("extractedResumeToCreditProposals preserves source text and skips empty rows", () => {
  const proposals = extractedResumeToCreditProposals({
    experiences: [
      {
        title: "Renaissance World Tour",
        artist: "Beyoncé",
        choreographer: "JaQuel Knight",
        role: "Dancer",
        category: "liveStage",
        startDate: "2023-01-01",
      },
      {
        title: null,
        artist: null,
        choreographer: null,
        projectTitle: null,
        company: null,
      },
    ],
  });

  assert.equal(proposals.length, 1);
  assert.equal(proposals[0]?.artistName, "Beyoncé");
  assert.equal(proposals[0]?.choreographerName, "JaQuel Knight");
  assert.equal(proposals[0]?.year, 2023);
  assert.ok(proposals[0]?.sourceText.includes("Beyoncé"));
});

test("all vs any matching helpers via search schema input shape", () => {
  const allInput = TalentNavigatorSearchSchema.parse({
    resolvedArtistIds: ["11111111-1111-4111-8111-111111111101"],
    resolvedChoreographerIds: ["11111111-1111-4111-8111-111111111103"],
    relationshipMatchMode: "all",
  });
  const anyInput = TalentNavigatorSearchSchema.parse({
    resolvedArtistIds: [
      "11111111-1111-4111-8111-111111111101",
      "11111111-1111-4111-8111-111111111102",
    ],
    relationshipMatchMode: "any",
  });
  assert.equal(allInput.relationshipMatchMode, "all");
  assert.equal(anyInput.artists.length, 0);
  assert.equal(anyInput.resolvedArtistIds.length, 2);
});

test("talentMatchesAllEntities requires every requested entity", () => {
  const rows = [
    {
      artist_entity_id: "a",
      choreographer_entity_id: null,
      production_entity_id: null,
    },
    {
      artist_entity_id: null,
      choreographer_entity_id: "c",
      production_entity_id: null,
    },
  ];
  assert.equal(talentMatchesAllEntities(rows, ["a"], ["c"], []), true);
  assert.equal(talentMatchesAllEntities(rows, ["a"], ["missing"], []), false);
  assert.equal(talentMatchesAnyEntity(rows, ["a", "other"], [], []), true);
  assert.equal(talentMatchesAnyEntity(rows, ["other"], [], []), false);
});
