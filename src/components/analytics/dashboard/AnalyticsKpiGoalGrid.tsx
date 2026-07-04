import { formatKpiValue } from "@/lib/analytics/kpi-goals";
import type { KpiMetric } from "@/lib/analytics/kpi-types";

export function AnalyticsKpiGoalGrid({ metrics }: { metrics: KpiMetric[] }) {
  if (metrics.length === 0) {
    return <p className="text-sm text-[var(--ink-soft)]">No KPI data available yet.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <article
          key={metric.key}
          className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)]/40 p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-[var(--ink-soft)]">{metric.label}</p>
            <span className="text-xs text-[var(--ink-soft)]">{metric.periodLabel}</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">
            {formatKpiValue(metric.current, metric.format)}
          </p>
          {metric.target != null ? (
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              Target: {formatKpiValue(metric.target, metric.format)}
            </p>
          ) : null}
          {metric.progressPct != null ? (
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-[var(--line)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all"
                  style={{ width: `${metric.progressPct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-[var(--ink-soft)]">{metric.progressPct}% of goal</p>
            </div>
          ) : null}
          {metric.hint ? (
            <p className="mt-2 text-xs text-[var(--ink-soft)]">{metric.hint}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
