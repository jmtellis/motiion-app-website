import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { progressPct } from "../src/lib/analytics/kpi-goals";
import {
  WEB_IOS_EVENT_ALIASES,
  WEEKLY_SCORECARD_EVENT_NAMES,
} from "../src/lib/analytics/events";
import {
  buildNorthStarGoals,
  buildWeeklyScorecard,
  flattenNorthStarMetrics,
  utcIsoWeekBounds,
} from "../src/lib/analytics/kpi-v1";
import type {
  KpiBusinessPayload,
  KpiNorthStarPayload,
  KpiRetentionPayload,
  KpiSupplyPayload,
  KpiTalentPayload,
  KpiVerifiedProfessionals,
} from "../src/lib/analytics/kpi-types";

const retention: KpiRetentionPayload = {
  dau: 10,
  wau: 40,
  mau: 120,
  mapu: 8,
  d7RetentionPct: 20,
  d30RetentionPct: 10,
  d90RetentionPct: 5,
};

const talent: KpiTalentPayload = {
  profileViewsThisMonth: 50,
  savesThisMonth: 4,
  profileSharesThisMonth: 2,
  bookingRequestsThisMonth: 1,
  messagesThisMonth: 6,
  mauDancers: 80,
  avgProfileViewsPerDancer: 1.2,
  avgSavesPerDancer: 0.1,
};

const verified: KpiVerifiedProfessionals = {
  total: 12,
  talentVerifiedProfiles: 10,
  industryIdentityVerified: 2,
  source: "test",
};

const supply: KpiSupplyPayload = {
  classesYtd: 3,
  sessionsYtd: 2,
  castingsYtd: 4,
  totalOpportunitiesYtd: 9,
  classesThisMonth: 1,
  sessionsThisMonth: 1,
  castingsThisMonth: 2,
  classesThisWeek: 0,
  sessionsThisWeek: 0,
  castingsThisWeek: 1,
  activeCreatorsThisMonth: 2,
  repeatCreatorsThisMonth: 1,
  repeatCreatorRatePct: 50,
};

const mapo: KpiNorthStarPayload = {
  count: 33,
  periodStart: "2026-08-01",
  periodEnd: "2026-08-31",
  periodLabel: "August 2026",
  breakdown: {
    submissions: 10,
    registrations: 5,
    rsvps: 4,
    saves: 3,
    bookingRequests: 2,
    profileShares: 1,
    messages: 6,
    analyticsEvents: 31,
  },
};

const business: KpiBusinessPayload = {
  totalUsers: 200,
  dancers: 150,
  proSubscribers: 12,
  payingDancers: 20,
  mrrCents: 150_000,
  arrCents: 1_800_000,
  newSubsThisMonth: 3,
  canceledSubsThisMonth: 1,
  trialConversionsThisMonth: 2,
  churnRatePct: 4,
  yearStart: "2026-01-01",
};

describe("KPI v1 north stars", () => {
  const goals = buildNorthStarGoals({
    periodLabel: "August 2026",
    retention,
    talent,
    verified,
    supply,
    mapo,
    business,
  });

  it("exposes one card per Notion business goal", () => {
    assert.deepEqual(
      goals.map((goal) => goal.key),
      [
        "creative_os",
        "trusted_network",
        "healthy_marketplace",
        "sustainable_growth",
        "longterm_expansion",
      ],
    );
  });

  it("maps Creative OS to platform MAU and labels it approximate", () => {
    const creative = goals[0];
    assert.equal(creative.northStarLabel, "Monthly Active Professionals");
    assert.equal(creative.primary?.current, 120);
    assert.equal(creative.primary?.source, "kpi_retention_summary.mau");
    assert.match(creative.description, /Approximate/i);
    assert.equal(creative.supporting.find((m) => m.key === "mau_dancers")?.current, 80);
  });

  it("maps Trusted Network to verified professionals with the 5,000 target", () => {
    const trusted = goals[1];
    assert.equal(trusted.northStarLabel, "Verified Professionals");
    assert.equal(trusted.primary?.current, 12);
    assert.equal(trusted.primary?.target, 5_000);
  });

  it("maps Healthy Marketplace to YTD opportunities and demotes MAPO", () => {
    const marketplace = goals[2];
    assert.equal(marketplace.northStarLabel, "Opportunities Created");
    assert.equal(marketplace.primary?.current, 9);
    assert.equal(marketplace.primary?.periodLabel, "Year to date");
    const momentum = marketplace.supporting.find((m) => m.key === "mapo_momentum");
    assert.equal(momentum?.current, 33);
    assert.match(momentum?.hint ?? "", /not a Notion north star/i);
    assert.equal(
      marketplace.supporting.find((m) => m.key === "opportunities_this_month")?.current,
      4,
    );
  });

  it("maps Sustainable Growth to MRR with Pro / ARR / trial / churn support", () => {
    const growth = goals[3];
    assert.equal(growth.northStarLabel, "MRR");
    assert.equal(growth.primary?.current, 150_000);
    assert.equal(growth.primary?.target, 3_000_000);
    assert.equal(growth.supporting.find((m) => m.key === "pro_subscribers")?.target, 1_000);
    assert.equal(growth.supporting.find((m) => m.key === "arr")?.target, 36_000_000);
    assert.equal(growth.supporting.find((m) => m.key === "trial_conversions")?.current, 2);
    const churn = growth.supporting.find((m) => m.key === "churn");
    assert.equal(churn?.current, 4);
    assert.equal(churn?.target, 5);
    assert.equal(churn?.direction, "down");
  });

  it("defers Longterm Expansion as not started", () => {
    const expansion = goals[4];
    assert.equal(expansion.status, "not_started");
    assert.equal(expansion.primary, null);
    assert.equal(expansion.supporting.length, 0);
  });

  it("does not treat MAPO as a primary north-star label", () => {
    const labels = flattenNorthStarMetrics(goals)
      .filter((m) => m.key === "mapo_momentum" || /north star/i.test(m.label))
      .map((m) => m.label);
    assert.deepEqual(labels, ["MAPO (momentum)"]);
    assert.ok(goals.every((goal) => goal.northStarLabel !== "Monthly Active Professional Opportunities"));
    assert.ok(goals.every((goal) => goal.primary?.key !== "mapo_momentum"));
  });
});

describe("weekly scorecard", () => {
  it("uses an ISO week starting Monday UTC", () => {
    const bounds = utcIsoWeekBounds(new Date("2026-08-22T15:00:00.000Z"));
    assert.equal(bounds.start.toISOString(), "2026-08-17T00:00:00.000Z");
    assert.equal(bounds.end.toISOString(), "2026-08-24T00:00:00.000Z");
    assert.match(bounds.periodLabel, /UTC week/);
  });

  it("starts Sunday dates on the prior Monday", () => {
    const bounds = utcIsoWeekBounds(new Date("2026-08-23T12:00:00.000Z"));
    assert.equal(bounds.start.toISOString(), "2026-08-17T00:00:00.000Z");
  });

  it("emits the July 29 scorecard fields", () => {
    const scorecard = buildWeeklyScorecard(
      {
        accountsCreated: 5,
        profilesCompleted: 3,
        verifiedProfiles: 1,
        qualifiedDiscoveryActions: 9,
        submissions: 2,
        shortlists: 4,
        bookings: 1,
      },
      utcIsoWeekBounds(new Date("2026-08-22T15:00:00.000Z")),
    );

    assert.deepEqual(
      scorecard.metrics.map((m) => m.key),
      [
        "accounts_created",
        "profiles_completed",
        "verified_profiles",
        "qualified_discovery",
        "submissions",
        "shortlists",
        "bookings",
      ],
    );
    assert.equal(scorecard.timezone, "UTC");
    assert.equal(scorecard.metrics.find((m) => m.key === "submissions")?.current, 2);
    assert.ok(scorecard.sources.qualifiedDiscoveryActions.includes("talent_navigator_search_submitted"));
  });
});

describe("progress and event aliases", () => {
  it("treats under-max churn as on track", () => {
    assert.equal(progressPct(4, 5, "down"), 100);
    assert.equal(progressPct(10, 5, "down"), 50);
    assert.equal(progressPct(0, 5, "down"), 100);
  });

  it("documents web↔iOS scorecard aliases", () => {
    assert.equal(WEB_IOS_EVENT_ALIASES.rsvp_submitted, "session_rsvp_completed");
    assert.equal(WEB_IOS_EVENT_ALIASES.class_guest_enrolled, "class_registration_completed");
    assert.ok(WEEKLY_SCORECARD_EVENT_NAMES.bookings.includes("booking_request_sent"));
    assert.ok(WEEKLY_SCORECARD_EVENT_NAMES.submissions.includes("casting_submission_completed"));
  });
});
