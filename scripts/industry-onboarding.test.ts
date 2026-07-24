import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildOnboardingSummary,
  deriveLegacyPrimaryGoal,
  getNextTalentBuyerStep,
  getPreviousTalentBuyerStep,
  getTalentBuyerFlowProgress,
  mapLegacyPrimaryGoalToPlatformGoals,
  marketLabelFromPlace,
  marketsFromPlaces,
  resolveIndustryPrimaryAction,
  resolveIndustrySecondaryAction,
  shouldShowWorkTypeFollowUp,
  suggestedMarkets,
  talentBuyerSteps,
  togglePlatformGoal,
  toggleWorkType,
  validateTalentBuyerStep,
} from "../src/lib/talent-buyers/onboarding";
import { mapBuyerRoleToLegacyNonTalentType, normalizeBuyerRole } from "../src/lib/talent-buyers/roles";
import {
  INDUSTRY_IDENTITY_REQUIRED_CODE,
  isIndustryIdentityRequiredError,
} from "../src/lib/talent-buyers/industry-identity-errors";
import { mapStripeIdentityStatus } from "../src/lib/billing/stripe";

describe("industry onboarding steps", () => {
  it("uses the three-stage actionable sequence plus success", () => {
    assert.deepEqual(talentBuyerSteps, [
      "professionalContext",
      "goalsAndWork",
      "organizationAndMarket",
      "success",
    ]);
    assert.equal(getNextTalentBuyerStep("professionalContext"), "goalsAndWork");
    assert.equal(getPreviousTalentBuyerStep("professionalContext"), "professionalContext");
    assert.equal(getNextTalentBuyerStep("organizationAndMarket"), "success");
  });

  it("counts three actionable steps in progress", () => {
    const progress = getTalentBuyerFlowProgress("organizationAndMarket");
    assert.equal(progress.currentStep, 3);
    assert.equal(progress.totalSteps, 3);
    assert.equal(progress.percent, 100);
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

describe("role and goal mapping", () => {
  it("normalizes legacy roles into the v3 set", () => {
    assert.equal(normalizeBuyerRole("casting_director"), "casting_professional");
    assert.equal(normalizeBuyerRole("producer"), "creative_director_or_producer");
    assert.equal(normalizeBuyerRole("talent_agency"), "talent_representative");
    assert.equal(normalizeBuyerRole("brand"), "brand_or_agency_professional");
    assert.equal(normalizeBuyerRole("studio_owner"), "other");
  });

  it("maps v3 roles back to legacy non_talent_type", () => {
    assert.equal(mapBuyerRoleToLegacyNonTalentType("casting_professional"), "casting_director");
    assert.equal(mapBuyerRoleToLegacyNonTalentType("talent_representative"), "agency");
  });

  it("maps legacy primary goals into platform goals", () => {
    assert.deepEqual(mapLegacyPrimaryGoalToPlatformGoals("find_talent"), ["find_dancers"]);
    assert.deepEqual(mapLegacyPrimaryGoalToPlatformGoals("post_opportunities"), ["run_a_casting"]);
    assert.equal(deriveLegacyPrimaryGoal(["find_dancers"]), "find_talent");
    assert.equal(deriveLegacyPrimaryGoal(["run_a_casting"]), "post_opportunities");
    assert.equal(deriveLegacyPrimaryGoal(["just_exploring"]), "everything");
  });
});

describe("platform goal selection", () => {
  it("makes Just exploring exclusive", () => {
    assert.deepEqual(togglePlatformGoal(["find_dancers"], "just_exploring"), ["just_exploring"]);
    assert.deepEqual(togglePlatformGoal(["just_exploring"], "find_dancers"), ["find_dancers"]);
    assert.deepEqual(togglePlatformGoal(["just_exploring"], "just_exploring"), []);
  });

  it("shows work-type follow-up only for active hiring goals", () => {
    assert.equal(shouldShowWorkTypeFollowUp(["just_exploring"]), false);
    assert.equal(shouldShowWorkTypeFollowUp(["find_dancers"]), true);
    assert.equal(shouldShowWorkTypeFollowUp([]), false);
  });

  it("toggles work types and clears other custom when deselected", () => {
    assert.deepEqual(toggleWorkType([], "film_or_television"), ["film_or_television"]);
    assert.deepEqual(toggleWorkType(["film_or_television"], "film_or_television"), []);
  });
});

describe("organization and professional context validation", () => {
  const base = {
    fullName: "Jordan Ellis",
    contactEmail: "jordan@studio.com",
    role: "casting_professional",
    customRole: "",
    platformGoals: ["find_dancers"] as string[] as import("../src/types/talent-buyers").TalentBuyerPlatformGoal[],
    workTypes: [] as import("../src/types/talent-buyers").TalentBuyerWorkType[],
    customWorkType: "",
    organizationRelationship: "organization" as const,
    organizationName: "Studio",
    organizationWebsite: "",
    markets: ["Los Angeles, CA"],
    marketPlaces: [
      {
        placeId: "abc",
        city: "Los Angeles",
        region: "CA",
        country: "United States",
        displayLabel: "Los Angeles, CA",
      },
    ],
  };

  it("requires custom role when Other is selected", () => {
    assert.equal(
      validateTalentBuyerStep("professionalContext", {
        ...base,
        role: "other",
        customRole: "",
      }),
      "Tell us your role.",
    );
    assert.equal(
      validateTalentBuyerStep("professionalContext", {
        ...base,
        role: "other",
        customRole: "Movement director",
      }),
      null,
    );
  });

  it("requires organization name for organization and multiple paths", () => {
    assert.equal(
      validateTalentBuyerStep("organizationAndMarket", {
        ...base,
        organizationRelationship: "organization",
        organizationName: "",
      }),
      "Select or enter your organization.",
    );
    assert.equal(
      validateTalentBuyerStep("organizationAndMarket", {
        ...base,
        organizationRelationship: "independent",
        organizationName: "",
      }),
      null,
    );
  });

  it("requires at least one goal", () => {
    assert.equal(
      validateTalentBuyerStep("goalsAndWork", {
        ...base,
        platformGoals: [],
      }),
      "Select at least one goal to continue.",
    );
  });
});

describe("personalized CTA priority", () => {
  it("prioritizes casting over project over find dancers", () => {
    assert.equal(resolveIndustryPrimaryAction(["run_a_casting", "find_dancers"]).id, "create_casting");
    assert.equal(resolveIndustryPrimaryAction(["staff_a_project", "find_dancers"]).id, "create_project");
    assert.equal(resolveIndustryPrimaryAction(["find_dancers"]).id, "find_dancers");
    assert.equal(resolveIndustryPrimaryAction(["build_a_roster"]).id, "start_roster");
    assert.equal(resolveIndustryPrimaryAction(["just_exploring"]).id, "explore");
  });

  it("provides a secondary action except for explore-only", () => {
    const primary = resolveIndustryPrimaryAction(["find_dancers"]);
    assert.equal(resolveIndustrySecondaryAction(primary)?.id, "explore");
    assert.equal(resolveIndustrySecondaryAction(resolveIndustryPrimaryAction(["just_exploring"])), null);
  });

  it("builds a summary without empty values", () => {
    assert.equal(
      buildOnboardingSummary({
        role: "casting_professional",
        workTypes: ["commercial_or_branded"],
        marketPlaces: [
          {
            placeId: "la",
            city: "Los Angeles",
            region: "CA",
            country: "United States",
            displayLabel: "Los Angeles",
          },
        ],
      }),
      "Casting professional · Commercial or branded content · Los Angeles, CA",
    );
  });
});

describe("identity gate helper", () => {
  it("detects identity-required errors", () => {
    assert.equal(
      isIndustryIdentityRequiredError({
        ok: false,
        code: INDUSTRY_IDENTITY_REQUIRED_CODE,
        error: "Verify your identity to contact talent and publish opportunities.",
      }),
      true,
    );
    assert.equal(isIndustryIdentityRequiredError({ ok: true }), false);
    assert.equal(isIndustryIdentityRequiredError({ ok: false, error: "Something else" }), false);
  });
});

describe("stripe identity status mapping", () => {
  it("maps Stripe session statuses", () => {
    assert.equal(mapStripeIdentityStatus("verified"), "verified");
    assert.equal(mapStripeIdentityStatus("processing"), "processing");
    assert.equal(mapStripeIdentityStatus("requires_input"), "requires_input");
  });
});
