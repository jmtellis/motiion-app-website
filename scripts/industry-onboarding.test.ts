import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getNextTalentBuyerStep,
  getPreviousTalentBuyerStep,
  getTalentBuyerFlowProgress,
  marketLabelFromPlace,
  marketsFromPlaces,
  suggestedMarkets,
  talentBuyerSteps,
  validateTalentBuyerStep,
} from "../src/lib/talent-buyers/onboarding";
import { mapStripeIdentityStatus } from "../src/lib/billing/stripe";

describe("industry onboarding steps", () => {
  it("uses the shortened five-step actionable sequence", () => {
    assert.deepEqual(talentBuyerSteps, [
      "primaryGoal",
      "role",
      "organization",
      "markets",
      "verification",
      "success",
    ]);
    assert.equal(getNextTalentBuyerStep("primaryGoal"), "role");
    assert.equal(getPreviousTalentBuyerStep("primaryGoal"), "primaryGoal");
    assert.equal(getNextTalentBuyerStep("verification"), "success");
  });

  it("counts five actionable steps in progress", () => {
    const progress = getTalentBuyerFlowProgress("markets");
    assert.equal(progress.currentStep, 4);
    assert.equal(progress.totalSteps, 5);
    assert.equal(progress.percent, 80);
  });

  it("renames New York chip suggestion to New York City", () => {
    assert.ok(suggestedMarkets.includes("New York City"));
    assert.ok(!suggestedMarkets.includes("New York" as never));
  });
});

describe("market place labels", () => {
  it("builds canonical City, ST labels from Google place parts", () => {
    const label = marketLabelFromPlace({
      placeId: "abc",
      city: "Los Angeles",
      region: "CA",
      country: "United States",
      displayLabel: "Los Angeles",
    });
    assert.equal(label, "Los Angeles, CA");
    assert.deepEqual(
      marketsFromPlaces([
        {
          placeId: "nyc",
          city: "New York",
          region: "NY",
          country: "United States",
          displayLabel: "New York",
        },
      ]),
      ["New York, NY"],
    );
  });
});

describe("verification step validation", () => {
  const base = {
    dateOfBirth: "1990-01-01",
    fullName: "Jordan Ellis",
    contactEmail: "jordan@studio.com",
    avatarUrl: "https://example.com/a.jpg",
    primaryGoal: "find_talent",
    role: "casting_director",
    organizationName: "Studio",
    companySize: "just_me",
    markets: ["Los Angeles, CA"],
    marketPlaces: [
      {
        placeId: "p1",
        city: "Los Angeles",
        region: "CA",
        country: "United States",
        displayLabel: "Los Angeles",
      },
    ],
  };

  it("requires identity verification before finishing", () => {
    assert.equal(
      validateTalentBuyerStep("verification", { ...base, identityVerified: false }),
      "Complete identity verification to finish setup.",
    );
    assert.equal(
      validateTalentBuyerStep("verification", { ...base, identityVerified: true }),
      null,
    );
  });

  it("requires DOB, name, email, and photo on the identity step", () => {
    assert.match(
      validateTalentBuyerStep("verification", {
        ...base,
        dateOfBirth: "",
        identityVerified: true,
      }) ?? "",
      /Date of birth/,
    );
    assert.match(
      validateTalentBuyerStep("verification", {
        ...base,
        avatarUrl: "",
        identityVerified: true,
      }) ?? "",
      /profile photo/i,
    );
  });
});

describe("stripe identity status mapping", () => {
  it("maps verified and requires_input statuses", () => {
    assert.equal(mapStripeIdentityStatus("verified"), "verified");
    assert.equal(mapStripeIdentityStatus("requires_input"), "requires_input");
    assert.equal(mapStripeIdentityStatus("processing"), "processing");
  });
});
