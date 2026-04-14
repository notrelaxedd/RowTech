import type { TimingSpreadProps } from "@/types";
import { SEAT_LABELS } from "@/constants/seatColors";

// =============================================================================
// TimingSpread — Horizontal bar showing relative catch timing of all 8 seats.
// Outlier seat visually highlighted.
// =============================================================================

export function TimingSpread({ seats, outlierSeat, colors }: TimingSpreadProps) {
  const connected = seats.filter((s) => s.isConnected && s.catchSharpness > 0);
  if (connected.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border border-border bg-card text-xs text-muted-foreground">
        No timing data
      </div>
    );
  }

  const min = Math.min(...connected.map((s) => s.catchSharpness));
  const max = Math.max(...connected.map((s) => s.catchSharpness));
  const range = Math.max(max - min, 1);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Catch Timing Spread
      </h3>
      <div className="space-y-2">
        {[8, 7, 6, 5, 4, 3, 2, 1].map((seatNum) => {
          const seat  = seats.find((s) => s.seatNumber === seatNum);
          const color = colors[seatNum] ?? "#666";
          if (!seat || !seat.isConnected || seat.catchSharpness === 0) return null;

          const offset = ((seat.catchSharpness - min) / range) * 100;
          const isOut  = seatNum === outlierSeat;

          return (
            <div key={seatNum} className="flex items-center gap-2">
              <span className="w-14 text-right text-xs text-muted-foreground">
                {SEAT_LABELS[seatNum]}
              </span>
              <div className="relative h-4 flex-1 rounded-sm bg-secondary">
                <div
                  className="absolute top-0 h-full w-1 -translate-x-1/2 rounded-sm"
                  style={{ left: `${offset}%`, backgroundColor: color, opacity: isOut ? 1 : 0.7 }}
                  title={`${seat.catchSharpness}ms`}
                />
                {isOut && (
                  <div
                    className="absolute top-0 h-full w-1 -translate-x-1/2 rounded-sm opacity-30"
                    style={{ left: `${offset}%`, backgroundColor: color, transform: "translateX(-50%) scaleX(3)" }}
                  />
                )}
              </div>
              <span className="w-12 font-mono text-xs tabular-nums text-muted-foreground">
                {seat.catchSharpness}ms
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{min}ms</span>
        <span className="text-foreground">Spread: {max - min}ms</span>
        <span>{max}ms</span>
      </div>
    </div>
  );
}
