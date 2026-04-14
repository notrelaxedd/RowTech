"use client";

import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import type { SparklineChartProps } from "@/types";

// =============================================================================
// SparklineChart — Small inline trend chart for analytics cards.
// =============================================================================

export function SparklineChart({ data, color, height = 40 }: SparklineChartProps) {
  if (data.length === 0) return <div style={{ height }} />;

  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <YAxis domain={["auto", "auto"]} hide />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
