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
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#8a8a8a" }} />
          <YAxis tick={{ fontSize: 12, fill: "#8a8a8a" }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="events" stroke="#2dd4bf" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="activeUsers" stroke="#8a8a8a" strokeWidth={2} dot={false} />
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
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#8a8a8a" }} />
          <YAxis tick={{ fontSize: 12, fill: "#8a8a8a" }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="webEvents" stroke="#2dd4bf" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="iosEvents" stroke="#8a8a8a" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
