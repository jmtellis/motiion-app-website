import Link from "next/link";

import { getProfileInitials } from "@/lib/auth/avatar";
import type {
  AnalyticsRecentReferral,
  AnalyticsReferralsData,
  AnalyticsTopReferrer,
} from "@/lib/analytics/types";

function formatTimestamp(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function sourceLabel(source: string) {
  if (source === "deep_link") return "Deep link";
  if (source === "manual_code") return "Manual code";
  return source || "—";
}

function Avatar({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  avatarUrl: string | null;
  size?: "sm" | "md";
}) {
  const className = size === "sm" ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt="" className={`${className} rounded-full object-cover`} />
    );
  }

  return (
    <div
      className={`flex ${className} items-center justify-center rounded-full bg-[var(--line)] font-semibold text-[var(--ink)]`}
    >
      {getProfileInitials(name)}
    </div>
  );
}

function UserLink({
  userId,
  name,
  secondary,
  avatarUrl,
  range,
}: {
  userId: string;
  name: string;
  secondary: string | null;
  avatarUrl?: string | null;
  range: string;
}) {
  if (!userId) {
    return <span className="text-[var(--ink-soft)]">{name}</span>;
  }

  return (
    <Link
      href={`/admin/analytics?range=${range}&user=${userId}`}
      className="flex items-center gap-2 hover:opacity-80"
    >
      {avatarUrl !== undefined ? <Avatar name={name} avatarUrl={avatarUrl} size="sm" /> : null}
      <span>
        <span className="block font-medium text-[var(--ink)]">{name}</span>
        {secondary ? <span className="block text-xs text-[var(--ink-soft)]">{secondary}</span> : null}
      </span>
    </Link>
  );
}

function TopReferrersTable({
  referrers,
  range,
}: {
  referrers: AnalyticsTopReferrer[];
  range: string;
}) {
  if (referrers.length === 0) {
    return <p className="text-sm text-[var(--ink-soft)]">No referrers in this range.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] text-[var(--ink-soft)]">
            <th className="px-3 py-2 font-medium">Referrer</th>
            <th className="px-3 py-2 font-medium">Signups</th>
          </tr>
        </thead>
        <tbody>
          {referrers.map((referrer) => (
            <tr key={referrer.userId} className="border-b border-[var(--line)] last:border-0">
              <td className="px-3 py-3">
                <UserLink
                  userId={referrer.userId}
                  name={referrer.displayName}
                  secondary={referrer.email ?? (referrer.username ? `@${referrer.username}` : null)}
                  avatarUrl={referrer.avatarUrl}
                  range={range}
                />
              </td>
              <td className="px-3 py-3 font-medium text-[var(--ink)]">{referrer.referralCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentReferralsTable({
  referrals,
  range,
}: {
  referrals: AnalyticsRecentReferral[];
  range: string;
}) {
  if (referrals.length === 0) {
    return <p className="text-sm text-[var(--ink-soft)]">No referred signups in this range.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] text-[var(--ink-soft)]">
            <th className="px-3 py-2 font-medium">Signed up</th>
            <th className="px-3 py-2 font-medium">Referred by</th>
            <th className="px-3 py-2 font-medium">Source</th>
            <th className="px-3 py-2 font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {referrals.map((referral) => (
            <tr key={referral.id} className="border-b border-[var(--line)] last:border-0">
              <td className="px-3 py-3">
                <UserLink
                  userId={referral.refereeUserId}
                  name={referral.refereeDisplayName}
                  secondary={
                    referral.refereeEmail ??
                    (referral.refereeUsername ? `@${referral.refereeUsername}` : null)
                  }
                  range={range}
                />
              </td>
              <td className="px-3 py-3">
                <UserLink
                  userId={referral.referrerUserId}
                  name={referral.referrerDisplayName}
                  secondary={
                    referral.referrerUsername
                      ? `@${referral.referrerUsername}`
                      : referral.referralCode
                        ? `code ${referral.referralCode}`
                        : null
                  }
                  range={range}
                />
              </td>
              <td className="px-3 py-3 text-[var(--ink-soft)]">{sourceLabel(referral.source)}</td>
              <td className="px-3 py-3 whitespace-nowrap text-[var(--ink-soft)]">
                {formatTimestamp(referral.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnalyticsReferralsPanel({
  data,
  range,
}: {
  data: AnalyticsReferralsData;
  range: string;
}) {
  return (
    <div className="space-y-6">
      <article className="ui-card p-4 sm:max-w-xs">
        <p className="text-sm font-medium text-[var(--ink-soft)]">Referred signups</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ink)]">
          {data.referredSignups}
        </p>
        <p className="mt-2 text-xs text-[var(--ink-soft)]">
          New accounts attributed in user_referrals
        </p>
      </article>

      <div className="grid gap-6 xl:grid-cols-2">
        <article className="ui-card p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-[var(--ink)]">Top referrers</h3>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              Members who brought the most signups in this window.
            </p>
          </div>
          <TopReferrersTable referrers={data.topReferrers} range={range} />
        </article>

        <article className="ui-card p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-[var(--ink)]">Recent referred signups</h3>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              Who signed up, who referred them, and how the code was claimed.
            </p>
          </div>
          <RecentReferralsTable referrals={data.recentReferrals} range={range} />
        </article>
      </div>
    </div>
  );
}
