import type { AnalyticsProductHealth } from "@/lib/analytics/types";

export function AnalyticsProductHealthGrid({ health }: { health: AnalyticsProductHealth }) {
  const items = [
    { label: "Messages sent", value: health.messagesSent },
    { label: "Active conversations", value: health.activeConversations },
    { label: "Active subscriptions", value: health.activeSubscriptions },
    { label: "Trialing subscriptions", value: health.trialingSubscriptions },
    { label: "Canceled subscriptions", value: health.canceledSubscriptions },
    { label: "Apple IAP subs", value: health.appleIapSubscriptions },
    { label: "Polar subs", value: health.polarSubscriptions },
    { label: "Profile views", value: health.profileViews },
    { label: "Activity views", value: health.activityViews },
    { label: "Recently viewed rows", value: health.recentlyViewedRows },
    { label: "Talent favorites", value: health.talentFavorites },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.label}
          className="rounded-xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3"
        >
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            {item.label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-[var(--ink)]">{item.value}</p>
        </article>
      ))}
    </div>
  );
}
