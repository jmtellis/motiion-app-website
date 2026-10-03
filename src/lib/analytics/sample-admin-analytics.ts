import type { AdminAnalyticsDetailData, AdminAnalyticsHomeData } from "@/lib/analytics/admin-home-data";
import { attachEarlySignalIdentity } from "@/lib/analytics/early-signals";
import type { KpiMetric } from "@/lib/analytics/kpi-types";
import { parseAnalyticsDateRange } from "@/lib/analytics/date-range";
import {
  buildSignupSeries,
  eachUtcDay,
  type SignupProfileRow,
} from "@/lib/analytics/signup-series";
import type {
  AnalyticsDashboardData,
  AnalyticsRecentEvent,
  AnalyticsUserSummary,
} from "@/lib/analytics/types";

type SamplePerson = {
  userId: string;
  displayName: string | null;
  email: string | null;
  username: string | null;
  accountType: string | null;
  acquisitionSource: string | null;
  acquisitionSourceDetail: string | null;
  color: string;
  initials: string;
  daysAgo: number;
  hoursAgo: number;
  profileSetup: boolean;
  firstActivity: boolean;
  eventStored: boolean;
};

const SAMPLE_PEOPLE: SamplePerson[] = [
  {
    userId: "sample-ada",
    displayName: "Ada Okonkwo",
    email: "ada@example.com",
    username: "ada",
    accountType: "talent",
    acquisitionSource: "instagram",
    acquisitionSourceDetail: null,
    color: "#0f766e",
    initials: "AO",
    daysAgo: 0,
    hoursAgo: 3,
    profileSetup: true,
    firstActivity: true,
    eventStored: true,
  },
  {
    userId: "sample-jonah",
    displayName: "Jonah Ellis",
    email: "jonah@example.com",
    username: "jonah",
    accountType: "lookingForTalent",
    acquisitionSource: "friend_or_referral",
    acquisitionSourceDetail: null,
    color: "#9a3412",
    initials: "JE",
    daysAgo: 0,
    hoursAgo: 18,
    profileSetup: true,
    firstActivity: true,
    eventStored: true,
  },
  {
    userId: "sample-missing",
    displayName: null,
    email: null,
    username: null,
    accountType: null,
    acquisitionSource: null,
    acquisitionSourceDetail: null,
    color: "#525252",
    initials: "?",
    daysAgo: 0,
    hoursAgo: 8,
    profileSetup: false,
    firstActivity: false,
    eventStored: false,
  },
  {
    userId: "sample-mina",
    displayName: "Mina Chen",
    email: "mina@example.com",
    username: "mina",
    accountType: "community",
    acquisitionSource: "event",
    acquisitionSourceDetail: null,
    color: "#4338ca",
    initials: "MC",
    daysAgo: 3,
    hoursAgo: 4,
    profileSetup: true,
    firstActivity: true,
    eventStored: true,
  },
  {
    userId: "sample-leo",
    displayName: "Leo Park",
    email: "leo@example.com",
    username: "leo",
    accountType: "talent",
    acquisitionSource: "motiion_founder",
    acquisitionSourceDetail: null,
    color: "#6d28d9",
    initials: "LP",
    daysAgo: 12,
    hoursAgo: 2,
    profileSetup: true,
    firstActivity: true,
    eventStored: false,
  },
  {
    userId: "sample-priya",
    displayName: "Priya Shah",
    email: "priya@example.com",
    username: "priya",
    accountType: "talent",
    acquisitionSource: "other",
    acquisitionSourceDetail: "Dance class flyer",
    color: "#be123c",
    initials: "PS",
    daysAgo: 40,
    hoursAgo: 6,
    profileSetup: false,
    firstActivity: false,
    eventStored: false,
  },
];

const OTHER_DETAILS = ["Dance class flyer", "Podcast", "Studio bulletin"];
const SOURCE_WEIGHTS = [
  { source: "instagram", weight: 5 },
  { source: "friend_or_referral", weight: 3 },
  { source: "motiion_founder", weight: 2 },
  { source: "event", weight: 2 },
  { source: "other", weight: 2 },
  { source: null, weight: 1 },
] as const;

function avatarUrl(initials: string, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="40" fill="${color}"/><text x="40" y="48" text-anchor="middle" font-family="sans-serif" font-size="28" fill="white">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function atHoursAgo(now: Date, daysAgo: number, hoursAgo: number) {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  date.setUTCHours(date.getUTCHours() - hoursAgo, 0, 0, 0);
  return date.toISOString();
}

function wave(index: number, salt: number, scale: number) {
  return Math.max(
    0,
    Math.round(scale + Math.sin((index + salt) / 3.5) * scale * 0.55 + ((index + salt) % 3)),
  );
}

function distribute(total: number, weights: number[]) {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const raw = weights.map((weight) => (total * weight) / weightSum);
  const counts = raw.map((value) => Math.floor(value));
  let remainder = total - counts.reduce((sum, count) => sum + count, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const item of order) {
    if (remainder <= 0) break;
    counts[item.index] += 1;
    remainder -= 1;
  }
  return counts;
}

function sampleSignupRows(now: Date, sinceIso: string): SignupProfileRow[] {
  const days = eachUtcDay(sinceIso, now);
  const rows: SignupProfileRow[] = [];
  days.forEach((day, index) => {
    const talent = wave(index, 1, 3);
    const industry = wave(index, 4, 2);
    const community = wave(index, 7, 1);
    const types = [
      { accountType: "talent", count: talent },
      { accountType: "lookingForTalent", count: industry },
      { accountType: "community", count: community },
    ];
    const signups = talent + industry + community;
    const sourceCounts = distribute(
      signups,
      SOURCE_WEIGHTS.map((item) => item.weight),
    );
    const sources = SOURCE_WEIGHTS.flatMap((item, sourceIndex) =>
      Array.from({ length: sourceCounts[sourceIndex] ?? 0 }, () => item.source),
    );
    let cursor = 0;
    for (const type of types) {
      for (let count = 0; count < type.count; count += 1) {
        const source = sources[cursor] ?? null;
        cursor += 1;
        const detail =
          source === "other" ? OTHER_DETAILS[(index + count) % OTHER_DETAILS.length] : null;
        rows.push({
          createdAt: `${day}T12:00:00.000Z`,
          accountType: type.accountType,
          acquisitionSource: source,
          acquisitionSourceDetail: detail,
        });
      }
    }
  });
  return rows;
}

function personAvatar(person: SamplePerson) {
  if (!person.displayName) return null;
  return avatarUrl(person.initials, person.color);
}

function toUserSummary(person: SamplePerson, now: Date): AnalyticsUserSummary {
  return {
    userId: person.userId,
    displayName: person.displayName ?? person.userId,
    email: person.email,
    username: person.username,
    avatarUrl: personAvatar(person),
    accountType: person.accountType,
    role: null,
    eventCount: person.firstActivity ? 4 : 1,
    sessionCount: 1,
    lastSeenAt: atHoursAgo(now, person.daysAgo, Math.max(person.hoursAgo - 1, 0)),
    activeDays: 1,
    platforms: ["web"],
    topEvents: person.firstActivity ? [{ eventName: "activity_viewed", count: 1 }] : [],
  };
}

function matchesQuery(person: SamplePerson, query: string) {
  if (!query) return true;
  const haystack = [person.displayName, person.email, person.username]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function inRange(iso: string, sinceIso: string) {
  return iso >= sinceIso;
}

function sampleMetric(
  key: string,
  label: string,
  current: number,
  format: KpiMetric["format"],
  periodLabel: string,
  hint?: string,
): KpiMetric {
  return {
    key,
    label,
    current,
    target: null,
    progressPct: null,
    periodLabel,
    format,
    hint,
  };
}

function sampleDashboard(
  now: Date,
  sinceIso: string,
  range: ReturnType<typeof parseAnalyticsDateRange>,
  people: SamplePerson[],
): AnalyticsDashboardData {
  const days = eachUtcDay(sinceIso, now);
  return {
    range: { key: range.key, label: range.label, sinceIso: range.sinceIso },
    metrics: [
      { key: "total_events", label: "Total events", value: days.length * 6, hint: "Sample events" },
      { key: "active_users", label: "Active users", value: people.length, hint: "Sample people" },
    ],
    eventVolumeSeries: days.map((day, index) => ({
      day,
      events: 8 + (index % 5),
      activeUsers: 2 + (index % 3),
      webEvents: 5 + (index % 3),
      iosEvents: 3 + (index % 2),
    })),
    platformSplit: [
      { platform: "web", count: 24 },
      { platform: "ios", count: 11 },
    ],
    accountTypeSplit: [
      { accountType: "Talent", count: 14 },
      { accountType: "Industry", count: 6 },
      { accountType: "Community", count: 4 },
    ],
    topEvents: [
      { key: "activity_viewed", label: "Activity viewed", count: 18 },
      { key: "page_viewed", label: "Page viewed", count: 11 },
    ],
    topPaths: [
      { key: "/home", label: "/home", count: 9 },
      { key: "/activity/sample", label: "/activity/sample", count: 7 },
    ],
    topUsers: people.filter((person) => person.displayName).map((person) => toUserSummary(person, now)),
    funnel: [
      {
        eventName: "onboarding_completed",
        label: "Onboarding completed",
        count: 8,
        uniqueUsers: 8,
        conversionRate: null,
      },
      {
        eventName: "activity_viewed",
        label: "Activity viewed",
        count: 5,
        uniqueUsers: 5,
        conversionRate: 62.5,
      },
    ],
    retention: days.slice(-7).map((day, index) => ({ day, returningUsers: index + 1 })),
    recentEvents: [],
    productHealth: {
      messagesSent: 2,
      activeConversations: 1,
      activeSubscriptions: 0,
      trialingSubscriptions: 0,
      canceledSubscriptions: 0,
      appleIapSubscriptions: 0,
      polarSubscriptions: 0,
      profileViews: 6,
      activityViews: 5,
      recentlyViewedRows: 4,
      talentFavorites: 1,
    },
    referrals: {
      referredSignups: 0,
      topReferrers: [],
      recentReferrals: [],
    },
    searchResults: [],
    selectedUser: null,
    userTimeline: [],
  };
}

export function buildSampleAdminAnalytics(params: {
  range?: string | null;
  query?: string | null;
  user?: string | null;
  now?: Date;
}): { home: AdminAnalyticsHomeData; detail: AdminAnalyticsDetailData } {
  const now = params.now ?? new Date();
  const range = parseAnalyticsDateRange(params.range);
  const query = params.query?.trim() ?? "";
  const series = buildSignupSeries(sampleSignupRows(now, range.sinceIso), range.sinceIso, now);
  const visiblePeople = SAMPLE_PEOPLE.filter((person) =>
    inRange(atHoursAgo(now, person.daysAgo, person.hoursAgo), range.sinceIso),
  );

  const earlyRows = visiblePeople.map((person) => {
    const createdAt = atHoursAgo(now, person.daysAgo, person.hoursAgo);
    return attachEarlySignalIdentity(
      {
        userId: person.userId,
        accountCreatedAt: createdAt,
        profileSetupCompletedAt: person.profileSetup ? createdAt : null,
        firstActivityViewedAt: person.firstActivity ? createdAt : null,
      },
      person.displayName
        ? {
            user_id: person.userId,
            display_name: person.displayName,
            email: person.email,
            username: person.username,
            headshot_urls: personAvatar(person) ? [personAvatar(person)!] : [],
          }
        : null,
      person.eventStored ? "activity_viewed" : null,
    );
  });

  const recentEvents: AnalyticsRecentEvent[] = visiblePeople.flatMap((person) => {
    if (!person.firstActivity) return [];
    const createdAt = atHoursAgo(now, person.daysAgo, Math.max(person.hoursAgo - 1, 0));
    return [
      {
        id: `event-${person.userId}`,
        eventName: "activity_viewed",
        platform: "web" as const,
        path: "/activity/sample-class",
        sessionId: null,
        createdAt,
        properties: { kind: "class" },
        userId: person.userId,
        displayName: person.displayName ?? person.userId,
        email: person.email,
        username: person.username,
        avatarUrl: personAvatar(person),
        accountType: person.accountType,
        role: null,
      },
    ];
  });

  const searched = visiblePeople.filter((person) => matchesQuery(person, query));
  const selected = visiblePeople.find((person) => person.userId === params.user) ?? null;

  const home: AdminAnalyticsHomeData = {
    rangeKey: range.key,
    rangeLabel: range.label,
    sinceIso: range.sinceIso,
    query,
    userId: params.user?.trim() ?? "",
    series,
    seriesError: null,
    earlySignals: {
      summary: {
        accountsCreated: visiblePeople.length,
        profileSetupCompleted: visiblePeople.filter((person) => person.profileSetup).length,
        firstActivityAfterSetup: visiblePeople.filter((person) => person.firstActivity).length,
      },
      rows: earlyRows,
      error: null,
    },
    recentEvents,
    referrals: {
      referredSignups: visiblePeople.some((person) => person.userId === "sample-mina") ? 1 : 0,
      topReferrers: visiblePeople.some((person) => person.userId === "sample-mina")
        ? [
            {
              userId: "sample-jonah",
              displayName: "Jonah Ellis",
              username: "jonah",
              email: "jonah@example.com",
              avatarUrl: avatarUrl("JE", "#9a3412"),
              referralCount: 1,
            },
          ]
        : [],
      recentReferrals: visiblePeople.some((person) => person.userId === "sample-mina")
        ? [
            {
              id: "sample-referral-mina",
              createdAt: atHoursAgo(now, 3, 4),
              source: "deep_link",
              referralCode: "JONAH",
              referrerUserId: "sample-jonah",
              referrerDisplayName: "Jonah Ellis",
              referrerUsername: "jonah",
              referrerEmail: "jonah@example.com",
              referrerAvatarUrl: avatarUrl("JE", "#9a3412"),
              refereeUserId: "sample-mina",
              refereeDisplayName: "Mina Chen",
              refereeUsername: "mina",
              refereeEmail: "mina@example.com",
              refereeAvatarUrl: avatarUrl("MC", "#4338ca"),
            },
          ]
        : [],
    },
    searchResults: query ? searched.map((person) => toUserSummary(person, now)) : [],
    selectedUser: selected ? toUserSummary(selected, now) : null,
    userTimeline: selected ? recentEvents.filter((event) => event.userId === selected.userId) : [],
    listsError: null,
  };

  const period = "Sample month";
  const detail: AdminAnalyticsDetailData = {
    rangeKey: range.key,
    rangeLabel: range.label,
    otherDetails: series.otherDetails,
    seriesError: null,
    kpi: {
      northStar: {
        count: 12,
        periodStart: range.sinceIso,
        periodEnd: now.toISOString(),
        periodLabel: period,
        breakdown: {
          submissions: 2,
          registrations: 3,
          rsvps: 2,
          saves: 1,
          bookingRequests: 1,
          profileShares: 1,
          messages: 1,
          analyticsEvents: 1,
        },
      },
      business: null,
      supply: null,
      demand: null,
      talent: null,
      retention: null,
      executiveMetrics: [
        sampleMetric("pro_subscribers", "Pro subscribers", 0, "number", "Active", "Paying Pro dancers"),
        sampleMetric("mrr", "MRR", 0, "currency", period),
        sampleMetric("ytd_opportunities", "YTD opportunities", 4, "number", "Year to date"),
      ],
      growthMetrics: [
        sampleMetric("arr", "ARR", 0, "currency", "Projected"),
        sampleMetric("trial_conversions", "Trial → paid", 0, "number", period),
        sampleMetric("churn", "Churn rate", 0, "percent", period),
      ],
      supplyMetrics: [
        sampleMetric("classes_ytd", "Classes (YTD)", 2, "number", "Year to date"),
        sampleMetric("sessions_ytd", "Sessions (YTD)", 1, "number", "Year to date"),
        sampleMetric("castings_ytd", "Castings (YTD)", 1, "number", "Year to date"),
      ],
      demandMetrics: [
        sampleMetric("registrations", "Class registrations", 3, "number", period),
        sampleMetric("rsvps", "Session RSVPs", 2, "number", period),
        sampleMetric("submissions", "Casting submissions", 2, "number", period),
      ],
      talentMetrics: [
        sampleMetric("profile_views", "Profile views", 6, "number", period),
        sampleMetric("saves", "Talent saves", 1, "number", period),
        sampleMetric("booking_requests", "Booking requests", 1, "number", period),
      ],
      retentionMetrics: [sampleMetric("mapu", "MAPU", 0, "number", period, "Monthly active paying users")],
      error: null,
    },
    dashboard: sampleDashboard(now, range.sinceIso, range, visiblePeople),
    detailError: null,
  };

  return { home, detail };
}
