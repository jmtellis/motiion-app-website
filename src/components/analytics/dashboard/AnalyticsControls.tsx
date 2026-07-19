import Link from "next/link";

import { ANALYTICS_DATE_RANGE_OPTIONS } from "@/lib/analytics/date-range";

export function AnalyticsRangeControls({
  currentRange,
  query,
  user,
}: {
  currentRange: string;
  query?: string;
  user?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ANALYTICS_DATE_RANGE_OPTIONS.map((range) => {
        const params = new URLSearchParams();
        params.set("range", range);
        if (query) params.set("query", query);
        if (user) params.set("user", user);

        const active = currentRange === range;

        return (
          <Link
            key={range}
            href={`/admin/analytics?${params.toString()}`}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              active
                ? "bg-[var(--ink)] text-white"
                : "border border-[var(--line)] bg-[var(--surface-card)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
            }`}
          >
            {range}
          </Link>
        );
      })}
    </div>
  );
}

export function AnalyticsSearchForm({
  range,
  query,
  user,
}: {
  range: string;
  query?: string;
  user?: string;
}) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="range" value={range} />
      {user ? <input type="hidden" name="user" value={user} /> : null}
      <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-sm">
        <span className="font-medium text-[var(--ink-soft)]">Search users</span>
        <input
          type="search"
          name="query"
          defaultValue={query ?? ""}
          placeholder="Name, email, username, or user ID"
          className="rounded-full border border-[var(--line)] bg-[var(--surface-card)] px-4 py-2.5 text-[var(--ink)] outline-none focus:border-[rgb(17_17_17_/_0.35)]"
        />
      </label>
      <button type="submit" className="btn-primary text-sm">
        Search
      </button>
      {query || user ? (
        <Link href={`/admin/analytics?range=${range}`} className="btn-secondary text-sm">
          Clear
        </Link>
      ) : null}
    </form>
  );
}
