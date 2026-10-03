import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ANALYTICS_EARLY_SIGNAL_ROW_COLUMNS,
  ANALYTICS_SIGNAL_SUMMARY_COLUMNS,
  mapEarlySignalRow,
  mapSignalSummary,
} from "../src/lib/analytics/early-signals";

describe("early signal column lists", () => {
  it("reads only the three summary counts", () => {
    assert.equal(
      ANALYTICS_SIGNAL_SUMMARY_COLUMNS,
      "accounts_created, profile_setup_completed, first_activity_after_setup",
    );
    assert.doesNotMatch(ANALYTICS_SIGNAL_SUMMARY_COLUMNS, /subscription/);
  });

  it("reads only the three per-person timestamps plus user id", () => {
    assert.equal(
      ANALYTICS_EARLY_SIGNAL_ROW_COLUMNS,
      "user_id, account_created_at, profile_setup_completed_at, first_activity_viewed_at",
    );
    assert.doesNotMatch(ANALYTICS_EARLY_SIGNAL_ROW_COLUMNS, /subscription/);
    assert.doesNotMatch(ANALYTICS_EARLY_SIGNAL_ROW_COLUMNS, /onboarding_completed_at/);
    assert.doesNotMatch(ANALYTICS_EARLY_SIGNAL_ROW_COLUMNS, /acquisition_source/);
  });
});

describe("mapSignalSummary", () => {
  it("maps the three counts and ignores subscription fields", () => {
    const summary = mapSignalSummary({
      accounts_created: 85,
      profile_setup_completed: 17,
      first_activity_after_setup: 2,
      subscription_started: 99,
      subscription_canceled: 12,
    });

    assert.deepEqual(summary, {
      accountsCreated: 85,
      profileSetupCompleted: 17,
      firstActivityAfterSetup: 2,
    });
  });

  it("treats missing or invalid counts as zero", () => {
    assert.deepEqual(mapSignalSummary(null), {
      accountsCreated: 0,
      profileSetupCompleted: 0,
      firstActivityAfterSetup: 0,
    });
    assert.deepEqual(
      mapSignalSummary({
        accounts_created: "nope",
        profile_setup_completed: -4,
        first_activity_after_setup: undefined,
      }),
      {
        accountsCreated: 0,
        profileSetupCompleted: 0,
        firstActivityAfterSetup: 0,
      },
    );
  });
});

describe("mapEarlySignalRow", () => {
  it("maps the three signal timestamps and drops extra fields", () => {
    const row = mapEarlySignalRow({
      user_id: "user-1",
      account_created_at: "2026-01-01T00:00:00Z",
      profile_setup_completed_at: "2026-01-02T00:00:00Z",
      first_activity_viewed_at: "2026-01-03T00:00:00Z",
      subscription_started: "2026-01-04T00:00:00Z",
      onboarding_completed_at: "2026-01-01T12:00:00Z",
    });

    assert.deepEqual(row, {
      userId: "user-1",
      accountCreatedAt: "2026-01-01T00:00:00Z",
      profileSetupCompletedAt: "2026-01-02T00:00:00Z",
      firstActivityViewedAt: "2026-01-03T00:00:00Z",
    });
    assert.equal("subscriptionStarted" in row, false);
  });
});
