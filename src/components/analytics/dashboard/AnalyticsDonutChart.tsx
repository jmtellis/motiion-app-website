"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#111111", "#666666", "#999999", "#cccccc"];

export function AnalyticsDonutChart({
  data,
  nameKey,
  valueKey,
}: {
  data: Array<Record<string, string | number>>;
  nameKey: string;
  valueKey: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-[var(--ink-soft)]">No split data in this range.</p>;
  }

  const chartData = data.map((item) => ({
    name: String(item[nameKey]),
    value: Number(item[valueKey]),
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
          >
            {chartData.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
