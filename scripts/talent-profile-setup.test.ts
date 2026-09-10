import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  acknowledgeSkip,
  buildChecklist,
  isFullyFilled,
  isSetupFinished,
  isStepFilled,
  primaryCtaTitle,
  shouldSkipPhysicalTalentDetails,
  unfilledSteps,
  type TalentSetupProfile,
} from "../src/lib/talent/profile-setup";

function baseProfile(overrides: Partial<TalentSetupProfile> = {}): TalentSetupProfile {
  return {
    userId: "00000000-0000-0000-0000-000000000001",
    firstName: "Ada",
    lastName: "Lovelace",
    displayName: "Ada Lovelace",
    talentTypes: ["dancer"],
    headshotUrls: ["https://example.com/a.jpg"],
    gender: "Woman",
    ethnicity: "White",
    height: "5'6\"",
    hairColor: "Brown",
    eyeColor: "Brown",
    workingLocations: ["Los Angeles"],
    unionStatus: "Non-union",
    styles: ["Commercial"],
    skills: ["Jazz"],
    experiences: [{ title: "Video" }],
    deferredSetupSkipped: {},
    ...overrides,
  };
}

describe("talent profile-setup parity", () => {
  it("treats choreographer-only as skipping physical details", () => {
    assert.equal(shouldSkipPhysicalTalentDetails(["choreographer"]), true);
    assert.equal(shouldSkipPhysicalTalentDetails(["choreographer", "dancer"]), false);
  });

  it("requires lane-2 fields before setup is finished", () => {
    const partial = baseProfile({ styles: [], experiences: [], skills: [] });
    assert.equal(isFullyFilled(partial), false);
    assert.equal(isSetupFinished(partial), false);
    assert.ok(unfilledSteps(partial).length > 0);
  });

  it("honors explicit profile_setup_completed_at", () => {
    const finished = baseProfile({
      profileSetupCompletedAt: "2026-09-09T00:00:00.000Z",
      styles: [],
      skills: [],
      experiences: [],
    });
    assert.equal(isSetupFinished(finished), true);
  });

  it("treats sizing skip ack as filled", () => {
    const skipped = baseProfile({
      sizing: "",
      deferredSetupSkipped: acknowledgeSkip("sizing", {}),
    });
    assert.equal(isStepFilled("sizing", skipped), true);
  });

  it("builds checklist cta titles like iOS", () => {
    const checklist = buildChecklist({
      profile: baseProfile({ profileSetupCompletedAt: null, styles: [] }),
      reviewStatus: "not_submitted",
      highlightsCount: 0,
      socialCount: 0,
    });
    assert.equal(checklist[0]?.title, "Finish setting up your profile");
    assert.equal(primaryCtaTitle(0, "finishSetup"), "Start");
    assert.equal(primaryCtaTitle(2, "finishSetup"), "Resume");
    assert.equal(primaryCtaTitle(3, "submitProfile"), "Submit");
  });
});
