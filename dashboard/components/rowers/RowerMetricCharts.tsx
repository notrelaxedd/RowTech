"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatDate, round } from "@/lib/utils";
import type { ProfileSession } from "@/types";

// =============================================================================
// RowerMetricCharts — Career trend line charts for each metric.
// =============================================================================

interface RowerMetricChartsProps {
  sessions: ProfileSession[];
}

interface MetricChartProps {
  data:    { label: string; value: number | null }[];
  title:   string;
  unit:    string;
  color:   string;
}

function MetricChart({ data, title, unit, color }: MetricChartProps) {
  const valid = data.filter((d) => d.value !== null);
  if (valid.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: "hsl(215 20% 65%)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "hsl(215 20% 65%)" }}
            tickLine={false}
            axisLine={false}
            width={28}
            tickFormatter={(v: number) => `${round(v, 1)}${unit}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222 47% 11%)",
              border:          "1px solid hsl(217 33% 17%)",
              borderRadius:    "6px",
              fontSize:        11,
            }}
            formatter={(value: number) => [`${round(value, 2)} ${unit}`, title]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, r: 3 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RowerMetricCharts({ sessions }: RowerMetricChartsProps) {
  const chartData = [...sessions].reverse().map(({ session, avg_feather, avg_rush, avg_catch, avg_stroke_rate }) => ({
    label:           formatDate(session.started_at).slice(0, 6),
    feather:         avg_feather,
    rush:            avg_rush,
    catch:           avg_catch,
    rate:            avg_stroke_rate,
  }));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <MetricChart
        data={chartData.map((d) => ({ label: d.label, value: d.feather }))}
        title="Feather Angle"
        unit="°"
        color="#0ea5e9"
      />
      <MetricChart
        data={chartData.map((d) => ({ label: d.label, value: d.rush }))}
        title="Rush Score"
        unit=""
        color="#f59e0b"
      />
      <MetricChart
        data={chartData.map((d) => ({ label: d.label, value: d.catch }))}
        title="Catch Sharpness"
        unit="ms"
        color="#a78bfa"
      />
      <MetricChart
        data={chartData.map((d) => ({ label: d.label, value: d.rate }))}
        title="Stroke Rate"
        unit="spm"
        color="#22c55e"
      />
    </div>
  );
}
