import { getFullName } from "@/lib/auth/profile";
import { getProfileAvatarUrl } from "@/lib/auth/avatar";
import type { AnalyticsEnrichedUser, AnalyticsRecentEvent } from "@/lib/analytics/types";
import type { AnalyticsPlatform } from "@/lib/analytics/types";

type ProfileRow = {
  user_id: string;
  email?: string | null;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  headshot_urls?: string[] | null;
  account_type?: string | null;
  role?: string | null;
};

type EventRow = {
  id: string;
  event_name: string;
  platform: AnalyticsPlatform;
  path: string | null;
  user_id: string | null;
  session_id?: string | null;
  created_at: string;
  properties?: Record<string, unknown> | null;
  profiles?: ProfileRow | ProfileRow[] | null;
};

export function profileToEnrichedUser(profile: ProfileRow | null | undefined): AnalyticsEnrichedUser | null {
  if (!profile?.user_id) {
    return null;
  }

  return {
    userId: profile.user_id,
    displayName: getFullName({
      display_name: profile.display_name ?? null,
      first_name: profile.first_name ?? null,
      last_name: profile.last_name ?? null,
    }),
    email: profile.email ?? null,
    username: profile.username ?? null,
    avatarUrl: getProfileAvatarUrl(profile.headshot_urls),
    accountType: profile.account_type ?? null,
    role: profile.role ?? null,
  };
}

export function enrichEventRow(row: EventRow): AnalyticsRecentEvent {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const user = profileToEnrichedUser(profile);

  return {
    id: row.id,
    eventName: row.event_name,
    platform: row.platform,
    path: row.path,
    sessionId: row.session_id ?? null,
    createdAt: row.created_at,
    properties: (row.properties as Record<string, unknown>) ?? {},
    userId: row.user_id,
    displayName: user?.displayName ?? (row.user_id ? "Unknown user" : "Anonymous"),
    email: user?.email ?? null,
    username: user?.username ?? null,
    avatarUrl: user?.avatarUrl ?? null,
    accountType: user?.accountType ?? null,
    role: user?.role ?? null,
  };
}
