"use client";

import { useState } from "react";
import { OverlayLineChart } from "@/components/charts/OverlayLineChart";
import { SeatFilter }       from "./SeatFilter";
import { SEAT_COLORS, SEAT_ORDER } from "@/constants/seatColors";
import type { Stroke, ChartSeries, ChartDataPoint } from "@/types";

// =============================================================================
// StrokeChart — Historical overlay chart for session detail view.
// Metric selector + seat filter + zoom via recharts ReferenceArea.
// =============================================================================

type Metric = "feather_angle" | "rush_score" | "catch_sharpness" | "stroke_rate";

const METRIC_OPTIONS: { value: Metric; label: string; unit: string }[] = [
  { value: "feather_angle",   label: "Feather Angle",   unit: "°"   },
  { value: "rush_score",      label: "Rush Score",      unit: "/10" },
  { value: "catch_sharpness", label: "Catch Sharpness", unit: "ms"  },
  { value: "stroke_rate",     label: "Stroke Rate",     unit: "spm" },
];

interface StrokeChartProps {
  strokesBySeat: Record<number, Stroke[]>;
}

export function StrokeChart({ strokesBySeat }: StrokeChartProps) {
  const [metric,      setMetric]      = useState<Metric>("feather_angle");
  const [activeSeats, setActiveSeats] = useState<Set<number>>(new Set(SEAT_ORDER));

  const toggleSeat = (seatNum: number) => {
    setActiveSeats((prev) => {
      const next = new Set(prev);
      next.has(seatNum) ? next.delete(seatNum) : next.add(seatNum);
      return next;
    });
  };

  const series: ChartSeries[] = SEAT_ORDER.map((seatNum) => {
    const strokes = strokesBySeat[seatNum] ?? [];
    const data: ChartDataPoint[] = strokes.map((s, i) => ({
      x:     i,
      value: (s[metric] as number | null) ?? NaN,
    }));

    return {
      seatNumber: seatNum,
      color:      SEAT_COLORS[seatNum] ?? "#888",
      data,
      active:     activeSeats.has(seatNum),
    };
  });

  const selectedMetric = METRIC_OPTIONS.find((m) => m.value === metric);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Stroke Chart</h3>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as Metric)}
          className="rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {METRIC_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <OverlayLineChart series={series} height={240} yLabel={selectedMetric?.unit} />

      <div className="mt-3">
        <SeatFilter activeSeats={activeSeats} onToggle={toggleSeat} />
      </div>
    </div>
  );
}
