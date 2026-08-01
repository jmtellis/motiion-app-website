import assert from "node:assert/strict";
import test from "node:test";

import {
  applyClarificationAnswer,
  emptySearchIntent,
  removeBriefToken,
  validateSearchIntent,
} from "../src/lib/talent-navigator/search-intent.ts";
import { translateSubjectiveTerms } from "../src/lib/talent-navigator/subjective-terms.ts";
import {
  buildOppositeHeightWindow,
  DEFAULT_OPPOSITE_HEIGHT_TOLERANCE_INCHES,
  heightStringToInches,
} from "../src/lib/talent-navigator/opposite-match.ts";
import {
  buildSearchIntentFromDraft,
  heuristicReferenceParse,
  searchIntentToNavigatorFilters,
} from "../src/lib/talent-navigator/build-search-intent.ts";
import {
  buildMatchReasonsForTalent,
} from "../src/lib/talent-navigator/match-reasons.ts";
import {
  heuristicCreditParse,
  heightRangeFromNl,
  mapNlParsedToNavigatorFilters,
} from "../src/lib/talent-navigator/parse-nl-query.ts";
import { isTalentNavigatorIntentV1Enabled } from "../src/lib/talent-navigator/feature-flag.ts";
import type { Talent } from "../src/lib/talent-navigator/types.ts";

test("validateSearchIntent accepts versioned empty intent", () => {
  const result = validateSearchIntent(emptySearchIntent("Find dancers"));
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.intent.version, 1);
    assert.equal(result.intent.originalQuery, "Find dancers");
  }
});

test("validateSearchIntent rejects unknown hard filter fields", () => {
  const result = validateSearchIntent({
    ...emptySearchIntent("x"),
    hardFilters: [{ field: "not_a_field", operator: "eq", value: 1, source: "explicit" }],
  });
  assert.equal(result.ok, false);
});

test("translateSubjectiveTerms maps pretty without attractiveness scoring", () => {
  const terms = translateSubjectiveTerms("Looking for pretty blondes");
  assert.ok(terms.some((t) => /pretty/i.test(t.raw)));
  const pretty = terms.find((t) => /pretty/i.test(t.raw))!;
  assert.ok(pretty.labels.every((l) => !/pretty|attractive|hot/i.test(l)));
  assert.equal(pretty.clarificationNeeded, true);
});

test("translateSubjectiveTerms asks what edgy means", () => {
  const terms = translateSubjectiveTerms("Edgy dancers in LA");
  const edgy = terms.find((t) => /edgy/i.test(t.raw));
  assert.ok(edgy);
  assert.equal(edgy!.clarificationNeeded, true);
  assert.ok((edgy!.clarificationOptions?.length ?? 0) >= 2);
});

test("heuristicReferenceParse detects opposite without trait inversion", () => {
  const refs = heuristicReferenceParse("Find an opposite for Jordan.");
  assert.equal(refs.length, 1);
  assert.equal(refs[0]!.relation, "opposite");
  assert.equal(refs[0]!.name, "Jordan");
});

test("buildOppositeHeightWindow uses ±2 inch default", () => {
  const window = buildOppositeHeightWindow({ referenceHeight: "5'9\"" });
  assert.ok(window);
  assert.equal(window!.toleranceInches, DEFAULT_OPPOSITE_HEIGHT_TOLERANCE_INCHES);
  assert.equal(window!.referenceInches, 69);
  assert.equal(window!.minInches, 67);
  assert.equal(window!.maxInches, 71);
  assert.match(window!.heightFilter, /^between:/);
});

test("buildOppositeHeightWindow returns null without height", () => {
  assert.equal(buildOppositeHeightWindow({ referenceHeight: null }), null);
  assert.equal(buildOppositeHeightWindow({ referenceHeight: "" }), null);
});

test("heightStringToInches parses imperial heights", () => {
  assert.equal(heightStringToInches("5'10\""), 70);
  assert.equal(heightStringToInches("6'0\""), 72);
});

test("heightRangeFromNl maps to between filter instead of coarse bucket", () => {
  const filter = heightRangeFromNl("5'8\"", "5'10\"");
  assert.equal(filter, "between:68-70");
});

test("buildSearchIntentFromDraft separates hard hair/style from subjective pretty", () => {
  const intent = buildSearchIntentFromDraft({
    originalQuery: "Pretty blondes who perform hip-hop",
    draft: {
      hairColors: ["Blonde"],
      danceStyles: ["Hip-Hop"],
      subjectiveTerms: [{ raw: "pretty", translatedLabels: ["Polished/commercial"] }],
    },
    heuristicCredits: null,
  });

  assert.ok(intent.hardFilters.some((f) => f.field === "hairColor"));
  assert.ok(intent.hardFilters.some((f) => f.field === "danceStyle"));
  assert.ok(intent.semanticConcepts.some((c) => c.label.includes("Polished")));
  assert.ok(intent.briefTokens.some((t) => t.kind === "inferred"));
});

test("buildSearchIntentFromDraft opposite sets ranking and assumptions", () => {
  const intent = buildSearchIntentFromDraft({
    originalQuery: "Find an opposite for Jordan",
    draft: null,
    heuristicCredits: null,
  });
  assert.equal(intent.rankingProfile, "opposite_pairing");
  assert.ok(intent.referenceProfiles.some((r) => r.relation === "opposite"));
  assert.ok(intent.assumptions.some((a) => a.key === "opposite_no_trait_inversion"));
});

test("searchIntentToNavigatorFilters maps hard filters", () => {
  const intent = buildSearchIntentFromDraft({
    originalQuery: "LA union hip-hop",
    draft: {
      location: "Los Angeles",
      unionStatus: "SAG-AFTRA",
      danceStyles: ["Hip-Hop"],
    },
    heuristicCredits: null,
  });
  const filters = searchIntentToNavigatorFilters(intent);
  assert.equal(filters.location, "Los Angeles");
  assert.equal(filters.unionStatus, "SAG-AFTRA");
  assert.deepEqual(filters.genres, ["Hip-Hop"]);
});

test("removeBriefToken drops matching hard filter", () => {
  let intent = buildSearchIntentFromDraft({
    originalQuery: "LA dancers",
    draft: { location: "Los Angeles" },
    heuristicCredits: null,
  });
  const token = intent.briefTokens.find((t) => t.filterKey === "location");
  assert.ok(token);
  intent = removeBriefToken(intent, token!.id);
  assert.equal(intent.hardFilters.filter((f) => f.field === "location").length, 0);
});

test("applyClarificationAnswer updates opposite height tolerance", () => {
  let intent = buildSearchIntentFromDraft({
    originalQuery: "Find an opposite for Jordan",
    draft: null,
    heuristicCredits: null,
  });
  intent = applyClarificationAnswer(intent, "opposite_height_tolerance", ["tol_1"]);
  const ref = intent.referenceProfiles.find((r) => r.relation === "opposite");
  assert.equal(ref?.heightToleranceInches, 1);
});

test("buildMatchReasonsForTalent only uses evidence from profile", () => {
  const intent = buildSearchIntentFromDraft({
    originalQuery: "Hip-hop in Los Angeles",
    draft: { location: "Los Angeles", danceStyles: ["Hip-Hop"] },
    heuristicCredits: null,
  });
  const talent: Talent = {
    id: "1",
    slug: "alex",
    name: "Alex",
    styles: ["Hip-Hop", "Jazz"],
    location: "Los Angeles, CA",
    height: "5'9\"",
    imageUrl: "",
  };
  const reasons = buildMatchReasonsForTalent({ talent, intent });
  assert.ok(reasons.some((r) => /Hip-Hop|hip-hop/i.test(r.label)));
  assert.ok(reasons.some((r) => /Los Angeles/i.test(r.label)));
  assert.ok(!reasons.some((r) => /pretty|attractive/i.test(r.label)));
});

test("heuristicCreditParse still extracts worked-with artists", () => {
  const parsed = heuristicCreditParse("dancers who worked with Sabrina Carpenter");
  assert.deepEqual(parsed?.artists, ["Sabrina Carpenter"]);
});

test("mapNlParsedToNavigatorFilters keeps height as range string", () => {
  const filters = mapNlParsedToNavigatorFilters({
    heightMin: "5'8\"",
    heightMax: "5'10\"",
  });
  assert.equal(filters.height, "between:68-70");
});

test("feature flag defaults to enabled", () => {
  assert.equal(typeof isTalentNavigatorIntentV1Enabled(), "boolean");
  assert.equal(isTalentNavigatorIntentV1Enabled(), true);
});
