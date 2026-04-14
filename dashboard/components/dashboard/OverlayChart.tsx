"use client";

import { useState } from "react";
import { OverlayLineChart }            from "@/components/charts/OverlayLineChart";
import { SEAT_COLORS, SEAT_LABELS, SEAT_ORDER } from "@/constants/seatColors";
import type { SeatState, ChartSeries, ChartDataPoint } from "@/types";

// =============================================================================
// OverlayChart — Live dashboard overlay chart with metric selector and
// per-seat toggle checkboxes. Outlier seat rendered with 3px line.
// =============================================================================

type Metric = "featherAngle" | "rushScore" | "catchSharpness" | "strokeRate";

const METRIC_OPTIONS: { value: Metric; label: string; unit: string }[] = [
  { value: "featherAngle",   label: "Feather Angle",    unit: "°"   },
  { value: "rushScore",      label: "Rush Score",       unit: "/10" },
  { value: "catchSharpness", label: "Catch Sharpness",  unit: "ms"  },
  { value: "strokeRate",     label: "Stroke Rate",      unit: "spm" },
];

interface OverlayChartProps {
  seats:          SeatState[];
  outlierSeat:    number | null;
  historyWindow?: number;   // how many data points to keep per seat
}

// Rolling history buffer per seat
const MAX_HISTORY = 60;

type HistoryMap = Map<number, ChartDataPoint[]>;

function appendToHistory(
  prev: HistoryMap,
  seats: SeatState[],
  metric: Metric,
): HistoryMap {
  const next = new Map(prev);
  for (const seat of seats) {
    if (!seat.isConnected) continue;
    const existing = next.get(seat.seatNumber) ?? [];
    const value    = seat[metric] as number;
    const point: ChartDataPoint = { x: existing.length, value };
    const updated = [...existing, point].slice(-MAX_HISTORY);
    next.set(seat.seatNumber, updated);
  }
  return next;
}

export function OverlayChart({
  seats,
  outlierSeat,
}: OverlayChartProps) {
  const [metric,         setMetric]         = useState<Metric>("featherAngle");
  const [activeSeats,    setActiveSeats]    = useState<Set<number>>(new Set(SEAT_ORDER));
  const [history,        setHistory]        = useState<HistoryMap>(new Map());

  // Update history whenever seats prop changes (called from parent on each tick)
  // We use a ref-style pattern: update on render if seats changed
  const [prevSeats, setPrevSeats] = useState<SeatState[]>([]);
  if (prevSeats !== seats) {
    setPrevSeats(seats);
    setHistory((h) => appendToHistory(h, seats, metric));
  }

  const toggleSeat = (seatNumber: number) => {
    setActiveSeats((prev) => {
      const next = new Set(prev);
      if (next.has(seatNumber)) {
        next.delete(seatNumber);
      } else {
        next.add(seatNumber);
      }
      return next;
    });
  };

  const series: ChartSeries[] = SEAT_ORDER.map((seatNumber) => ({
    seatNumber,
    color:  SEAT_COLORS[seatNumber] ?? "#888",
    data:   history.get(seatNumber) ?? [],
    active: activeSeats.has(seatNumber),
  }));

  const selectedMetric = METRIC_OPTIONS.find((m) => m.value === metric);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Overlay Chart</h3>
        <select
          value={metric}
          onChange={(e) => {
            setMetric(e.target.value as Metric);
            setHistory(new Map());  // Reset history on metric change
          }}
          className="rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {METRIC_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Chart */}
      <OverlayLineChart
        series={series}
        outlierSeat={outlierSeat}
        height={220}
        yLabel={selectedMetric?.unit}
      />

      {/* Seat toggles */}
      <div className="mt-3 flex flex-wrap gap-2">
        {SEAT_ORDER.map((seatNum) => {
          const color   = SEAT_COLORS[seatNum] ?? "#888";
          const active  = activeSeats.has(seatNum);
          const isOut   = seatNum === outlierSeat;
          return (
            <button
              key={seatNum}
              onClick={() => toggleSeat(seatNum)}
              className="flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition-opacity"
              style={{
                borderColor: color,
                color:       active ? color : "hsl(215 20% 45%)",
                opacity:     active ? 1 : 0.5,
                fontWeight:  isOut ? 700 : 400,
              }}
              aria-pressed={active}
              aria-label={`Toggle ${SEAT_LABELS[seatNum] ?? `Seat ${seatNum}`}`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: active ? color : "hsl(215 20% 35%)" }}
              />
              {SEAT_LABELS[seatNum] ?? `Seat ${seatNum}`}
              {isOut && " ★"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
