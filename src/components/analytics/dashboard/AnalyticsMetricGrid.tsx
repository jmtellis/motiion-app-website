import type { AnalyticsMetricCard } from "@/lib/analytics/types";

export function AnalyticsMetricGrid({ metrics }: { metrics: AnalyticsMetricCard[] }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <article
          key={metric.key}
          className="ui-card p-4"
        >
          <p className="text-sm font-medium text-[var(--ink-soft)]">{metric.label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ink)]">{metric.value}</p>
          {metric.hint ? (
            <p className="mt-2 text-xs text-[var(--ink-soft)]">{metric.hint}</p>
          ) : null}
        </article>
      ))}
    </section>
  );
}
