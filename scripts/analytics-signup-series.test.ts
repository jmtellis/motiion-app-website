import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";

import { AnalyticsEarlySignals } from "../src/components/analytics/dashboard/AnalyticsEarlySignals";
import { AnalyticsHomeView } from "../src/components/analytics/dashboard/AnalyticsHomeView";
import { AnalyticsDetailView } from "../src/components/analytics/dashboard/AnalyticsDetailView";
import { attachEarlySignalIdentity } from "../src/lib/analytics/early-signals";
import { identityFromFields } from "../src/lib/analytics/person-identity";
import { buildSampleAdminAnalytics } from "../src/lib/analytics/sample-admin-analytics";
import {
  accountTypeMetricId,
  buildSignupSeries,
  SIGNUP_METRIC_ID,
  sourceMetricId,
} from "../src/lib/analytics/signup-series";

const NOW = new Date("2026-10-03T18:00:00.000Z");

describe("signup series", () => {
  it("keeps signups, source, and user type on one count axis", () => {
    const series = buildSignupSeries(
      [
        {
          createdAt: "2026-10-01T12:00:00.000Z",
          accountType: "talent",
          acquisitionSource: "instagram",
          acquisitionSourceDetail: null,
        },
        {
          createdAt: "2026-10-01T15:00:00.000Z",
          accountType: "lookingForTalent",
          acquisitionSource: "friend_or_referral",
          acquisitionSourceDetail: null,
        },
        {
          createdAt: "2026-10-02T12:00:00.000Z",
          accountType: "community",
          acquisitionSource: "other",
          acquisitionSourceDetail: "Dance class flyer",
        },
        {
          createdAt: "2026-10-02T13:00:00.000Z",
          accountType: "talent",
          acquisitionSource: null,
          acquisitionSourceDetail: null,
        },
      ],
      "2026-10-01T00:00:00.000Z",
      NOW,
    );

    const signups = series.points.reduce((sum, point) => sum + Number(point[SIGNUP_METRIC_ID]), 0);
    const sources = series.metrics
      .filter((metric) => metric.group === "How they heard")
      .reduce((sum, metric) => sum + metric.total, 0);
    const types = series.metrics
      .filter((metric) => metric.group === "User type")
      .reduce((sum, metric) => sum + metric.total, 0);

    assert.equal(signups, 4);
    assert.equal(sources, 4);
    assert.equal(types, 4);
    assert.equal(accountTypeMetricId("looking_for_talent"), "type:industry");
    assert.equal(sourceMetricId("motiion_founder"), "source:motiion_founder");
    assert.deepEqual(series.otherDetails, [{ detail: "Dance class flyer", count: 1 }]);
    assert.equal(
      series.metrics.some(
        (metric) => metric.id.startsWith("referral") || metric.label === "MRR" || metric.label === "App referrals",
      ),
      false,
    );
  });
});

describe("person identity", () => {
  it("uses a name and avatar and never prints a raw user id", () => {
    const named = identityFromFields({
      userId: "11111111-1111-1111-1111-111111111111",
      displayName: "Ada Okonkwo",
      email: "ada@example.com",
      username: "ada",
      avatarUrl: "https://example.com/ada.jpg",
    });
    assert.equal(named.displayName, "Ada Okonkwo");
    assert.equal(named.secondary, "ada@example.com");
    assert.equal(named.avatarUrl, "https://example.com/ada.jpg");
    assert.equal(JSON.stringify(named).includes("11111111"), false);

    const missing = identityFromFields({
      userId: "22222222-2222-2222-2222-222222222222",
      displayName: "22222222-2222-2222-2222-222222222222",
      email: null,
      username: null,
      avatarUrl: null,
    });
    assert.deepEqual(missing, {
      displayName: "No profile",
      secondary: null,
      avatarUrl: null,
    });
  });

  it("shows the stored first activity event name", () => {
    const row = attachEarlySignalIdentity(
      {
        userId: "user-1",
        accountCreatedAt: "2026-10-01T00:00:00.000Z",
        profileSetupCompletedAt: "2026-10-01T01:00:00.000Z",
        firstActivityViewedAt: "2026-10-01T02:00:00.000Z",
      },
      {
        user_id: "user-1",
        display_name: "Mina Chen",
        email: "mina@example.com",
        username: "mina",
        headshot_urls: ["https://example.com/mina.jpg"],
      },
      "activity_viewed",
    );

    assert.equal(row.displayName, "Mina Chen");
    assert.equal(row.firstActivityEventName, "Activity viewed");
    assert.equal(row.avatarUrl, "https://example.com/mina.jpg");
  });
});

describe("sample admin analytics preview", () => {
  it("leads with the shared chart and keeps marketplace headlines on the drill-down", () => {
    const { home, detail } = buildSampleAdminAnalytics({ range: "30d", now: NOW });
    const homeHtml = renderToStaticMarkup(
      createElement(AnalyticsHomeView, {
        data: home,
        hrefBase: "/preview/admin-analytics",
        preview: true,
      }),
    );
    const detailHtml = renderToStaticMarkup(
      createElement(AnalyticsDetailView, {
        data: detail,
        hrefBase: "/preview/admin-analytics",
        preview: true,
      }),
    );

    assert.match(homeHtml, /Who is joining/);
    assert.match(homeHtml, /aria-pressed="true"/);
    assert.match(homeHtml, /Instagram/);
    assert.match(homeHtml, /Talent/);
    assert.match(homeHtml, /accounts created per day/);
    assert.match(homeHtml, /recharts-responsive-container/);
    assert.match(homeHtml, /Ada Okonkwo/);
    assert.match(homeHtml, /No profile/);
    assert.match(homeHtml, /Activity viewed/);
    assert.match(homeHtml, /App referrals/);
    assert.match(homeHtml, /user_referrals/);
    assert.match(homeHtml, /href="\/preview\/admin-analytics\/detail\?range=30d#subscriptions"/);
    assert.doesNotMatch(homeHtml, /Monthly Active Professional Opportunities/);
    assert.doesNotMatch(homeHtml, />MRR</);
    assert.doesNotMatch(homeHtml, />sample-missing</);

    assert.match(detailHtml, /Monthly Active Professional Opportunities/);
    assert.match(detailHtml, /MRR/);
    assert.match(detailHtml, /Dance class flyer/);
    assert.match(detailHtml, /Event volume and paths/);
  });
});

describe("early signal people table", () => {
  it("renders a name and avatar instead of the user id", () => {
    const html = renderToStaticMarkup(
      createElement(AnalyticsEarlySignals, {
        summary: { accountsCreated: 1, profileSetupCompleted: 1, firstActivityAfterSetup: 1 },
        rows: [
          attachEarlySignalIdentity(
            {
              userId: "33333333-3333-3333-3333-333333333333",
              accountCreatedAt: "2026-10-01T00:00:00.000Z",
              profileSetupCompletedAt: "2026-10-01T01:00:00.000Z",
              firstActivityViewedAt: "2026-10-01T02:00:00.000Z",
            },
            {
              user_id: "33333333-3333-3333-3333-333333333333",
              display_name: "Ada Okonkwo",
              first_name: "Ada",
              last_name: "Okonkwo",
              email: "ada@example.com",
              username: "ada",
              headshot_urls: ["https://example.com/ada.jpg"],
            },
            "activity_viewed",
          ),
        ],
        error: null,
        hrefBase: "/preview/admin-analytics",
        range: "30d",
      }),
    );

    assert.match(html, /Ada Okonkwo/);
    assert.match(html, /ada@example.com/);
    assert.match(html, /https:\/\/example.com\/ada.jpg/);
    assert.match(html, /Activity viewed/);
    assert.doesNotMatch(html, />33333333-3333-3333-3333-333333333333</);
  });
});
