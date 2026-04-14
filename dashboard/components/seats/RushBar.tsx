import type { RushBarProps } from "@/types";
import { clamp } from "@/lib/utils";

// =============================================================================
// RushBar — Horizontal bar 0–10, green→amber→red color transition.
// =============================================================================

function rushColor(value: number): string {
  if (value < 4)  return "#22c55e";  // green
  if (value < 7)  return "#f59e0b";  // amber
  return "#ef4444";                  // red
}

export function RushBar({ value, color: _color }: RushBarProps) {
  const pct    = (clamp(value, 0, 10) / 10) * 100;
  const fillColor = rushColor(value);

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Rush</span>
        <span className="tabular-nums font-medium" style={{ color: fillColor }}>
          {value.toFixed(1)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: fillColor }}
          role="meter"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={10}
          aria-label={`Rush score ${value.toFixed(1)} out of 10`}
        />
      </div>
    </div>
  );
}
