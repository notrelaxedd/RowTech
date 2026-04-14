"use client";

import Image from "next/image";
import { PhaseIndicator } from "./PhaseIndicator";
import { FeatherGauge }   from "./FeatherGauge";
import { RushBar }        from "./RushBar";
import { cn }             from "@/lib/utils";
import type { SeatCardProps } from "@/types";

// =============================================================================
// SeatCard — One card per oar seat.
// Left accent border in seat color. Props-only, no data fetching.
// =============================================================================

function BatteryIndicator({ level }: { level: number }) {
  const pct   = Math.max(0, Math.min(100, level));
  const color = pct > 50 ? "#22c55e" : pct > 20 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-1" title={`Battery: ${pct}%`} aria-label={`Battery ${pct}%`}>
      <div className="relative flex h-3 w-5 items-center rounded-sm border border-current p-px" style={{ color }}>
        <div
          className="h-full rounded-sm"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
        <div
          className="absolute -right-0.5 top-1/2 h-1.5 w-0.5 -translate-y-1/2 rounded-r-sm"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="text-xs tabular-nums" style={{ color }}>{pct}%</span>
    </div>
  );
}

export function SeatCard({ seat, isOutlier, color, label }: SeatCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-lg border bg-card p-4 transition-shadow",
        isOutlier
          ? "border-amber-500/50 shadow-amber-500/10 shadow-lg"
          : "border-border",
        !seat.isConnected && "opacity-50",
      )}
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Rower avatar */}
          <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-secondary">
            {seat.rowerPhotoUrl ? (
              <Image
                src={seat.rowerPhotoUrl}
                alt={seat.rowerName ?? "Rower"}
                fill
                className="object-cover"
                sizes="32px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
                {seat.rowerName ? seat.rowerName[0]?.toUpperCase() : "?"}
              </div>
            )}
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight text-foreground">
              {seat.rowerName ?? "—"}
            </div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </div>
        <PhaseIndicator phase={seat.phase} />
      </div>

      {/* Feather gauge + stroke rate */}
      <div className="flex items-end justify-between gap-2">
        <FeatherGauge angleDeg={seat.featherAngle} color={color} />
        <div className="text-right">
          <div className="font-mono text-xl font-bold tabular-nums" style={{ color }}>
            {seat.strokeRate > 0 ? seat.strokeRate.toFixed(0) : "—"}
          </div>
          <div className="text-xs text-muted-foreground">spm</div>
          {seat.catchSharpness > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{seat.catchSharpness}</span>ms catch
            </div>
          )}
        </div>
      </div>

      {/* Rush bar */}
      <RushBar value={seat.rushScore} color={color} />

      {/* Footer */}
      <div className="flex items-center justify-between">
        <BatteryIndicator level={seat.batteryLevel} />
        {isOutlier && (
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
            Outlier
          </span>
        )}
        {!seat.isConnected && (
          <span className="text-xs text-muted-foreground">Disconnected</span>
        )}
      </div>
    </div>
  );
}
