"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { OverlayLineChartProps } from "@/types";
import { SEAT_LABELS } from "@/constants/seatColors";

// =============================================================================
// OverlayLineChart — Reusable multi-series line chart.
// Outlier seat line is 3px thick; others 1.5px.
// =============================================================================

interface OverlayLineChartPropsExtended extends OverlayLineChartProps {
  outlierSeat?: number | null;
  xLabel?:     string;
  yLabel?:     string;
}

export function OverlayLineChart({
  series,
  height = 260,
  outlierSeat,
  yLabel,
}: OverlayLineChartPropsExtended) {
  if (series.length === 0 || series.every((s) => s.data.length === 0)) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-border bg-card text-xs text-muted-foreground"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  // Build unified dataset: one entry per x tick, all seats as keys
  const allX = Array.from(
    new Set(series.flatMap((s) => s.data.map((d) => d.x))),
  ).sort((a, b) => a - b);

  const chartData = allX.map((x) => {
    const row: Record<string, number | string> = { x };
    for (const s of series) {
      const point = s.data.find((d) => d.x === x);
      row[`seat_${s.seatNumber}`] = point?.value ?? NaN;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <XAxis
          dataKey="x"
          tick={{ fontSize: 11, fill: "hsl(215 20% 65%)" }}
          tickLine={false}
          axisLine={{ stroke: "hsl(217 33% 17%)" }}
          label={
            yLabel
              ? undefined
              : undefined
          }
        />
        <YAxis
          tick={{ fontSize: 11, fill: "hsl(215 20% 65%)" }}
          tickLine={false}
          axisLine={{ stroke: "hsl(217 33% 17%)" }}
          width={36}
          label={
            yLabel
              ? {
                  value:    yLabel,
                  angle:    -90,
                  position: "insideLeft",
                  style:    { fontSize: 10, fill: "hsl(215 20% 65%)" },
                }
              : undefined
          }
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(222 47% 11%)",
            border:          "1px solid hsl(217 33% 17%)",
            borderRadius:    "6px",
            fontSize:        11,
          }}
          labelStyle={{ color: "hsl(210 40% 96%)" }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(value: string) => {
            const seatNum = parseInt(value.replace("seat_", ""), 10);
            return SEAT_LABELS[seatNum] ?? value;
          }}
        />
        {series
          .filter((s) => s.active)
          .map((s) => (
            <Line
              key={s.seatNumber}
              type="monotone"
              dataKey={`seat_${s.seatNumber}`}
              stroke={s.color}
              strokeWidth={s.seatNumber === outlierSeat ? 3 : 1.5}
              dot={false}
              connectNulls
              name={`seat_${s.seatNumber}`}
              label={
                s.seatNumber === outlierSeat
                  ? { position: "right", fontSize: 10, fill: s.color }
                  : undefined
              }
            />
          ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
