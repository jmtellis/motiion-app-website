import { AnalyticsPersonCell } from "@/components/analytics/dashboard/AnalyticsPersonCell";
import { identityFromFields } from "@/lib/analytics/person-identity";
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

function UserLink({
  userId,
  name,
  email,
  username,
  avatarUrl,
  hrefBase,
  range,
}: {
  userId: string;
  name: string;
  email?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  hrefBase: string;
  range: string;
}) {
  const person = identityFromFields({
    userId,
    displayName: name,
    email,
    username,
    avatarUrl,
  });

  if (!userId) {
    return <AnalyticsPersonCell person={person} />;
  }

  return (
    <AnalyticsPersonCell
      person={person}
      href={`${hrefBase}?range=${range}&user=${encodeURIComponent(userId)}`}
    />
  );
}

function TopReferrersTable({
  referrers,
  range,
  hrefBase,
}: {
  referrers: AnalyticsTopReferrer[];
  range: string;
  hrefBase: string;
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
                  email={referrer.email}
                  username={referrer.username}
                  avatarUrl={referrer.avatarUrl}
                  hrefBase={hrefBase}
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
  hrefBase,
}: {
  referrals: AnalyticsRecentReferral[];
  range: string;
  hrefBase: string;
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
                  email={referral.refereeEmail}
                  username={referral.refereeUsername}
                  avatarUrl={referral.refereeAvatarUrl}
                  hrefBase={hrefBase}
                  range={range}
                />
              </td>
              <td className="px-3 py-3">
                <UserLink
                  userId={referral.referrerUserId}
                  name={referral.referrerDisplayName}
                  email={referral.referrerEmail}
                  username={referral.referrerUsername}
                  avatarUrl={referral.referrerAvatarUrl}
                  hrefBase={hrefBase}
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
  hrefBase = "/admin/analytics",
}: {
  data: AnalyticsReferralsData;
  range: string;
  hrefBase?: string;
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

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <article className="ui-card min-w-0 overflow-hidden p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-[var(--ink)]">Top referrers</h3>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              Members who brought the most signups in this window.
            </p>
          </div>
          <TopReferrersTable referrers={data.topReferrers} range={range} hrefBase={hrefBase} />
        </article>

        <article className="ui-card min-w-0 overflow-hidden p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-[var(--ink)]">Recent referred signups</h3>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              Who signed up, who referred them, and how the code was claimed.
            </p>
          </div>
          <RecentReferralsTable referrals={data.recentReferrals} range={range} hrefBase={hrefBase} />
        </article>
      </div>
    </div>
  );
}
