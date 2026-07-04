"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AnalyticsTimeSeriesPoint } from "@/lib/analytics/types";

export function AnalyticsEventVolumeChart({ data }: { data: AnalyticsTimeSeriesPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-[var(--ink-soft)]">No time-series data in this range.</p>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="events" stroke="#111111" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="activeUsers" stroke="#666666" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AnalyticsPlatformVolumeChart({ data }: { data: AnalyticsTimeSeriesPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-[var(--ink-soft)]">No platform trend data in this range.</p>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="webEvents" stroke="#111111" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="iosEvents" stroke="#888888" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
