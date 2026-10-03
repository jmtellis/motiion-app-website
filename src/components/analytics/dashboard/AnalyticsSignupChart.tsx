"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  DEFAULT_SIGNUP_CHART_METRICS,
  signupMetricGroups,
  type SignupChartMetric,
  type SignupChartPoint,
} from "@/lib/analytics/signup-series";

export function AnalyticsSignupChart({
  points,
  metrics,
}: {
  points: SignupChartPoint[];
  metrics: SignupChartMetric[];
}) {
  const available = useMemo(() => new Set(metrics.map((metric) => metric.id)), [metrics]);
  const [selected, setSelected] = useState<string[]>(
    DEFAULT_SIGNUP_CHART_METRICS.filter((id) => available.has(id)),
  );
  const active = metrics.filter((metric) => selected.includes(metric.id));
  const groups = signupMetricGroups(metrics);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        {groups.map((group) => (
          <fieldset key={group.group} className="min-w-0">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
              {group.group}
            </legend>
            <div className="flex flex-wrap gap-2">
              {group.metrics.map((metric) => {
                const on = selected.includes(metric.id);
                return (
                  <button
                    key={metric.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(metric.id)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      on
                        ? "border-transparent text-[#0a0a0a]"
                        : "border-[var(--line)] bg-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]"
                    }`}
                    style={on ? { backgroundColor: metric.color } : undefined}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: on ? "#0a0a0a" : metric.color }}
                    />
                    {metric.label}
                    <span className={on ? "text-[#0a0a0a]/70" : "text-[var(--ink-soft)]"}>
                      {metric.total}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {points.length === 0 ? (
        <p className="text-sm text-[var(--ink-soft)]">No days in this range.</p>
      ) : active.length === 0 ? (
        <p className="text-sm text-[var(--ink-soft)]">Select a metric to draw it on the chart.</p>
      ) : (
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#a3a3a3" }} minTickGap={24} />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: "#a3a3a3" }}
                label={{
                  value: "Accounts created",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#a3a3a3",
                  fontSize: 12,
                }}
              />
              <Tooltip
                contentStyle={{
                  background: "#111111",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12,
                  color: "#ffffff",
                }}
              />
              <Legend />
              {active.map((metric) => (
                <Area
                  key={metric.id}
                  type="monotone"
                  dataKey={metric.id}
                  name={metric.label}
                  stroke={metric.color}
                  fill={metric.color}
                  fillOpacity={0.18}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="text-sm text-[var(--ink-soft)]">
        Each line is accounts created per day, so the selected metrics share this axis. Source and
        user type are splits of signups. Written answers for Other are not a stable line. App
        referrals are a separate list below, not a how-they-heard series.
      </p>
    </div>
  );
}
