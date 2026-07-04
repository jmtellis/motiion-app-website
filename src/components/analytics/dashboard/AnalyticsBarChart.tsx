"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { AnalyticsFeatureInsight } from "@/lib/analytics/types";

export function AnalyticsBarChart({
  data,
  valueKey = "count",
}: {
  data: AnalyticsFeatureInsight[];
  valueKey?: "count" | "uniqueUsers";
}) {
  if (data.length === 0) {
    return <p className="text-sm text-[var(--ink-soft)]">No data in this range.</p>;
  }

  const chartData = data.map((item) => ({
    name: item.label.length > 28 ? `${item.label.slice(0, 28)}…` : item.label,
    value: valueKey === "uniqueUsers" ? (item.uniqueUsers ?? 0) : item.count,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" fill="#111111" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
