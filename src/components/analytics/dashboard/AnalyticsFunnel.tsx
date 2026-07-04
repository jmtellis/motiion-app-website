import type { AnalyticsFunnelStep } from "@/lib/analytics/types";

export function AnalyticsFunnel({ steps }: { steps: AnalyticsFunnelStep[] }) {
  const maxUnique = Math.max(...steps.map((step) => step.uniqueUsers), 1);

  return (
    <div className="space-y-4">
      {steps.length === 0 ? (
        <p className="text-sm text-[var(--ink-soft)]">No funnel data in this range.</p>
      ) : (
        steps.map((step) => {
          const width = Math.max((step.uniqueUsers / maxUnique) * 100, step.uniqueUsers > 0 ? 8 : 0);

          return (
            <div key={step.eventName} className="space-y-2">
              <div className="flex items-center justify-between gap-4 text-sm">
                <div>
                  <p className="font-medium text-[var(--ink)]">{step.label}</p>
                  <p className="text-xs text-[var(--ink-soft)]">
                    {step.count} events · {step.uniqueUsers} users
                    {step.conversionRate != null ? ` · ${step.conversionRate.toFixed(0)}% from prior step` : ""}
                  </p>
                </div>
              </div>
              <div className="h-3 rounded-full bg-[var(--line)]">
                <div
                  className="h-3 rounded-full bg-[var(--ink)] transition-all"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
