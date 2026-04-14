"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { SEAT_COLORS, SEAT_LABELS, SEAT_ORDER } from "@/constants/seatColors";
import type { SeatState } from "@/types";

// =============================================================================
// SeatComparison — Bar chart comparing all 8 seats on a selected metric.
// =============================================================================

type Metric = "featherAngle" | "rushScore" | "catchSharpness" | "strokeRate";

const OPTIONS: { value: Metric; label: string; unit: string }[] = [
  { value: "featherAngle",   label: "Feather Angle",   unit: "°"   },
  { value: "rushScore",      label: "Rush Score",      unit: "/10" },
  { value: "catchSharpness", label: "Catch Sharpness", unit: "ms"  },
  { value: "strokeRate",     label: "Stroke Rate",     unit: "spm" },
];

interface SeatComparisonProps {
  seats: SeatState[];
}

export function SeatComparison({ seats }: SeatComparisonProps) {
  const [metric, setMetric] = useState<Metric>("featherAngle");

  const chartData = SEAT_ORDER.map((seatNum) => {
    const seat = seats.find((s) => s.seatNumber === seatNum);
    return {
      seat:  SEAT_LABELS[seatNum] ?? `Seat ${seatNum}`,
      value: seat?.isConnected ? (seat[metric] as number) : 0,
      color: SEAT_COLORS[seatNum] ?? "#888",
    };
  });

  const selectedOption = OPTIONS.find((o) => o.value === metric);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Seat Comparison</h3>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as Metric)}
          className="rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <XAxis
            dataKey="seat"
            tick={{ fontSize: 10, fill: "hsl(215 20% 65%)" }}
            tickLine={false}
            axisLine={{ stroke: "hsl(217 33% 17%)" }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(215 20% 65%)" }}
            tickLine={false}
            axisLine={{ stroke: "hsl(217 33% 17%)" }}
            width={32}
            label={{
              value:    selectedOption?.unit ?? "",
              angle:    -90,
              position: "insideLeft",
              style:    { fontSize: 10, fill: "hsl(215 20% 65%)" },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222 47% 11%)",
              border:          "1px solid hsl(217 33% 17%)",
              borderRadius:    "6px",
              fontSize:        11,
            }}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
