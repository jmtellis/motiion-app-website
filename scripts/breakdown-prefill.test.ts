import assert from "node:assert/strict";
import test from "node:test";

import { createDefaultCastingComposerForm, createDefaultRole } from "../src/lib/talent-buyers/casting-composer-defaults.ts";
import {
  getIncompleteContentSteps,
  getNextIncompleteStep,
  getNextWizardStep,
  getWizardStepSequence,
  validateCastingWizardStep,
} from "../src/lib/talent-buyers/casting-create-wizard.ts";
import { mergeBreakdownIntoCastingForms } from "../src/lib/talent-buyers/breakdown-prefill.ts";
import type { ExtractedBreakdownData } from "../src/lib/talent-buyers/breakdown-types.ts";
import type { ProjectComposerForm } from "../src/types/project.ts";

function seedContainer(): ProjectComposerForm {
  return {
    projectId: null,
    title: "",
    description: "",
    productionCompany: "",
    projectType: "casting",
    startDate: "",
    endDate: "",
    location: "",
    coverImageUrl: "",
    configuration: {
      attachments: [],
      composer_draft: true,
      create_metadata: {},
    },
  };
}

const sampleExtracted: ExtractedBreakdownData = {
  title: "Summer Campaign",
  description: "Seeking versatile dancers.",
  productionCompany: "Acme Productions",
  projectType: "casting",
  startDate: "2026-08-01",
  endDate: "2026-08-15",
  location: "Los Angeles, CA",
  castingKinds: ["commercial"],
  visibility: "public",
  locationMode: "in_person",
  locationCity: "Los Angeles",
  locationRegion: "CA",
  locationCountry: "USA",
  submissionDeadline: "2026-07-20",
  auditionDate: null,
  callbackDate: null,
  compensationCategory: "paid",
  rateType: "fixed",
  isUnion: false,
  compensationNotes: "Day rate provided",
  submissionMethod: "in_app",
  submissionMaterials: ["Headshot", "Reel / video"],
  submitterPolicy: "any_viewer",
  roles: [
    {
      title: "Lead Dancer",
      description: "Strong technique required",
      ageRangeMin: "18",
      ageRangeMax: "30",
      gender: "Any",
      peopleNeeded: "2",
      ethnicityPreferences: null,
      unionStatus: null,
    },
  ],
};

test("mergeBreakdownIntoCastingForms fills empty forms and marks sections", () => {
  const container = seedContainer();
  const casting = createDefaultCastingComposerForm();

  const result = mergeBreakdownIntoCastingForms(container, casting, sampleExtracted);

  assert.equal(result.casting.title, "Summer Campaign");
  assert.equal(result.casting.configuration.location_city, "Los Angeles");
  assert.equal(result.casting.roles.length, 1);
  assert.equal(result.casting.roles[0]?.title, "Lead Dancer");
  assert.ok(result.prefillSources.sections.has("basics"));
  assert.ok(result.prefillSources.sections.has("roles"));
});

test("mergeBreakdownIntoCastingForms does not overwrite existing values", () => {
  const container = seedContainer();
  container.title = "Existing Title";
  const casting = createDefaultCastingComposerForm();
  casting.title = "Existing Title";

  const result = mergeBreakdownIntoCastingForms(container, casting, sampleExtracted);

  assert.equal(result.casting.title, "Existing Title");
  assert.equal(result.container.title, "Existing Title");
});

test("wizard scratch path skips breakdown steps", () => {
  const sequence = getWizardStepSequence("scratch");
  assert.ok(!sequence.includes("breakdown"));
  assert.equal(getNextWizardStep("scratch", "start"), "basics");
});

test("wizard breakdown path includes upload and review", () => {
  const sequence = getWizardStepSequence("breakdown");
  assert.deepEqual(sequence.slice(0, 3), ["start", "breakdown", "breakdown_review"]);
  assert.equal(getNextWizardStep("breakdown", "breakdown"), "breakdown_review");
});

test("validateCastingWizardStep requires title on basics", () => {
  const container = seedContainer();
  const casting = createDefaultCastingComposerForm();
  assert.match(validateCastingWizardStep("basics", container, casting) ?? "", /title/i);

  casting.title = "Named casting";
  assert.match(validateCastingWizardStep("basics", container, casting) ?? "", /description/i);
});

test("validateCastingWizardStep requires role title", () => {
  const container = seedContainer();
  const casting = createDefaultCastingComposerForm();
  assert.match(validateCastingWizardStep("roles", container, casting) ?? "", /role/i);
});

test("getIncompleteContentSteps only returns gaps after breakdown", () => {
  const casting = createDefaultCastingComposerForm();
  casting.title = "Campaign";
  casting.description = "A full campaign description.";
  casting.productionCompany = "Acme";
  casting.isUnion = false;
  casting.visibility = "public";
  casting.configuration.casting_kinds = ["commercial"];
  casting.configuration.casting_kind = "commercial";
  casting.configuration.compensation_category_raw = "unpaid";
  casting.location = "Los Angeles";
  casting.roles = [{ ...createDefaultRole(), title: "Lead" }];

  assert.deepEqual(getIncompleteContentSteps(casting), ["review"]);
  assert.equal(getNextIncompleteStep(casting, "breakdown_review"), "review");
});

test("getIncompleteContentSteps includes roles when missing", () => {
  const casting = createDefaultCastingComposerForm();
  casting.title = "Campaign";
  casting.description = "A full campaign description.";
  casting.productionCompany = "Acme";
  casting.isUnion = false;
  casting.visibility = "public";
  casting.configuration.casting_kinds = ["commercial"];
  casting.configuration.casting_kind = "commercial";
  casting.configuration.compensation_category_raw = "unpaid";
  casting.location = "Los Angeles";

  const incomplete = getIncompleteContentSteps(casting);
  assert.ok(incomplete.includes("roles"));
  assert.equal(getNextIncompleteStep(casting, "breakdown_review"), "roles");
});
