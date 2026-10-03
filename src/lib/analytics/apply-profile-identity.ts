import type { LoadedProfileIdentity } from "@/lib/analytics/profile-identity-query";
import type {
  AnalyticsRecentEvent,
  AnalyticsRecentReferral,
  AnalyticsReferralsData,
  AnalyticsTopReferrer,
  AnalyticsUserSummary,
} from "@/lib/analytics/types";

function preferProfile(
  current: {
    displayName: string;
    email: string | null;
    username: string | null;
    avatarUrl: string | null;
  },
  profile: LoadedProfileIdentity | undefined,
) {
  if (!profile?.hasProfile) return current;
  return {
    displayName: profile.displayName,
    email: profile.email ?? current.email,
    username: profile.username ?? current.username,
    avatarUrl: profile.avatarUrl ?? current.avatarUrl,
  };
}

export function overlayUserSummary(
  user: AnalyticsUserSummary,
  profiles: Map<string, LoadedProfileIdentity>,
): AnalyticsUserSummary {
  const next = preferProfile(user, profiles.get(user.userId));
  return { ...user, ...next };
}

export function overlayRecentEvent<T extends AnalyticsRecentEvent>(
  event: T,
  profiles: Map<string, LoadedProfileIdentity>,
): T {
  if (!event.userId) return event;
  const next = preferProfile(
    {
      displayName: event.displayName,
      email: event.email,
      username: event.username,
      avatarUrl: event.avatarUrl,
    },
    profiles.get(event.userId),
  );
  return { ...event, ...next };
}

function overlayReferrer(
  referrer: AnalyticsTopReferrer,
  profiles: Map<string, LoadedProfileIdentity>,
): AnalyticsTopReferrer {
  const next = preferProfile(
    {
      displayName: referrer.displayName,
      email: referrer.email,
      username: referrer.username,
      avatarUrl: referrer.avatarUrl,
    },
    profiles.get(referrer.userId),
  );
  return { ...referrer, ...next };
}

function overlayRecentReferral(
  referral: AnalyticsRecentReferral,
  profiles: Map<string, LoadedProfileIdentity>,
): AnalyticsRecentReferral {
  const referrer = preferProfile(
    {
      displayName: referral.referrerDisplayName,
      email: referral.referrerEmail,
      username: referral.referrerUsername,
      avatarUrl: referral.referrerAvatarUrl,
    },
    profiles.get(referral.referrerUserId),
  );
  const referee = preferProfile(
    {
      displayName: referral.refereeDisplayName,
      email: referral.refereeEmail,
      username: referral.refereeUsername,
      avatarUrl: referral.refereeAvatarUrl,
    },
    profiles.get(referral.refereeUserId),
  );

  return {
    ...referral,
    referrerDisplayName: referrer.displayName,
    referrerEmail: referrer.email,
    referrerUsername: referrer.username,
    referrerAvatarUrl: referrer.avatarUrl,
    refereeDisplayName: referee.displayName,
    refereeEmail: referee.email,
    refereeUsername: referee.username,
    refereeAvatarUrl: referee.avatarUrl,
  };
}

export function overlayReferralPeople(
  referrals: AnalyticsReferralsData,
  profiles: Map<string, LoadedProfileIdentity>,
): AnalyticsReferralsData {
  return {
    ...referrals,
    topReferrers: referrals.topReferrers.map((referrer) => overlayReferrer(referrer, profiles)),
    recentReferrals: referrals.recentReferrals.map((referral) =>
      overlayRecentReferral(referral, profiles),
    ),
  };
}

export function profileIdsFromPeople(input: {
  recentEvents: AnalyticsRecentEvent[];
  referrals: AnalyticsReferralsData;
  searchResults: AnalyticsUserSummary[];
  selectedUser: AnalyticsUserSummary | null;
  userTimeline: AnalyticsRecentEvent[];
}) {
  return [
    ...input.recentEvents.map((event) => event.userId),
    ...input.userTimeline.map((event) => event.userId),
    ...input.searchResults.map((user) => user.userId),
    input.selectedUser?.userId ?? null,
    ...input.referrals.topReferrers.map((referrer) => referrer.userId),
    ...input.referrals.recentReferrals.flatMap((referral) => [
      referral.referrerUserId,
      referral.refereeUserId,
    ]),
  ].filter((id): id is string => Boolean(id));
}
