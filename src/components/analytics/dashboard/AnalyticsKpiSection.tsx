import { AnalyticsKpiGoalGrid } from "@/components/analytics/dashboard/AnalyticsKpiGoalGrid";
import type { KpiMetric } from "@/lib/analytics/kpi-types";

type Props = {
  title: string;
  description?: string;
  metrics: KpiMetric[];
};

export function AnalyticsKpiSection({ title, description, metrics }: Props) {
  return (
    <article className="ui-card p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[var(--ink)]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[var(--ink-soft)]">{description}</p> : null}
      </div>
      <AnalyticsKpiGoalGrid metrics={metrics} />
    </article>
  );
}
