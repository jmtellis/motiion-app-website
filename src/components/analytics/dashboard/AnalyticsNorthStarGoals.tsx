import { formatKpiValue } from "@/lib/analytics/kpi-goals";
import type { KpiMetric, KpiNorthStarGoal } from "@/lib/analytics/kpi-types";

function GoalMetric({ metric, emphasize = false }: { metric: KpiMetric; emphasize?: boolean }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[var(--ink-soft)]">{metric.label}</p>
        <span className="text-xs text-[var(--ink-soft)]">{metric.periodLabel}</span>
      </div>
      <p
        className={
          emphasize
            ? "mt-2 text-4xl font-semibold tracking-tight text-[var(--ink)]"
            : "mt-1 text-2xl font-semibold text-[var(--ink)]"
        }
      >
        {formatKpiValue(metric.current, metric.format)}
      </p>
      {metric.target != null ? (
        <p className="mt-1 text-xs text-[var(--ink-soft)]">
          {metric.direction === "down" ? "Max" : "Target"}:{" "}
          {formatKpiValue(metric.target, metric.format)}
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
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            {metric.direction === "down" && metric.current <= (metric.target ?? 0)
              ? "On track"
              : `${metric.progressPct}% of goal`}
          </p>
        </div>
      ) : null}
      {metric.hint ? <p className="mt-2 text-xs text-[var(--ink-soft)]">{metric.hint}</p> : null}
    </div>
  );
}

export function AnalyticsNorthStarGoals({ goals }: { goals: KpiNorthStarGoal[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {goals.map((goal) => (
        <article
          key={goal.key}
          className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)]/40 p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
            {goal.businessGoal}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--ink)]">{goal.northStarLabel}</h3>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">{goal.description}</p>

          {goal.status === "not_started" ? (
            <p className="mt-4 text-sm font-medium text-[var(--ink-soft)]">Not started</p>
          ) : goal.primary ? (
            <div className="mt-4">
              <GoalMetric metric={goal.primary} emphasize />
            </div>
          ) : null}

          {goal.supporting.length > 0 ? (
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              {goal.supporting.map((item) => (
                <div
                  key={item.key}
                  className="rounded-[var(--radius-chip)] border border-[var(--line)] bg-[#151515] px-3 py-2"
                >
                  <dt className="text-xs text-[var(--ink-soft)]">{item.label}</dt>
                  <dd className="text-lg font-semibold text-[var(--ink)]">
                    {formatKpiValue(item.current, item.format)}
                  </dd>
                  {item.target != null ? (
                    <p className="text-xs text-[var(--ink-soft)]">
                      {item.direction === "down" ? "Max" : "Target"}{" "}
                      {formatKpiValue(item.target, item.format)}
                    </p>
                  ) : null}
                </div>
              ))}
            </dl>
          ) : null}
        </article>
      ))}
    </div>
  );
}
