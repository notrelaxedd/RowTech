import { SparklineChart } from "@/components/charts/SparklineChart";
import { round }          from "@/lib/utils";
import type { MetricTrendCardProps } from "@/types";

// =============================================================================
// MetricTrendCard — Metric summary card with sparkline trend.
// =============================================================================

const TREND_ICONS: Record<"up" | "down" | "flat", string> = {
  up:   "↑",
  down: "↓",
  flat: "→",
};

const TREND_COLORS: Record<"up" | "down" | "flat", string> = {
  up:   "#22c55e",
  down: "#ef4444",
  flat: "#94a3b8",
};

export function MetricTrendCard({
  label,
  value,
  unit,
  data,
  color,
  trend,
}: MetricTrendCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {round(value, 1)}
            </span>
            <span className="text-xs text-muted-foreground">{unit}</span>
          </div>
        </div>
        <span
          className="mt-0.5 text-lg font-bold"
          style={{ color: TREND_COLORS[trend] }}
          aria-label={`Trend: ${trend}`}
        >
          {TREND_ICONS[trend]}
        </span>
      </div>
      <div className="mt-3">
        <SparklineChart data={data} color={color} height={40} />
      </div>
    </div>
  );
}
