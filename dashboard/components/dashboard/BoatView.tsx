"use client";

import { SeatCard }     from "@/components/seats/SeatCard";
import { SEAT_COLORS, SEAT_LABELS, SEAT_ORDER } from "@/constants/seatColors";
import type { BoatViewProps, SeatState } from "@/types";

// =============================================================================
// BoatView — 8 seat cards in boat layout (stern to bow), plus COX indicator.
// =============================================================================

function makeDefaultSeat(seatNumber: number): SeatState {
  const { PhaseType } = require("@/types");
  return {
    seatNumber,
    mac:            null,
    rowerName:      null,
    rowerPhotoUrl:  null,
    phase:          PhaseType.RECOVERY,
    roll:           0,
    pitch:          0,
    featherAngle:   0,
    rushScore:      0,
    strokeRate:     0,
    catchSharpness: 0,
    batteryLevel:   0,
    isConnected:    false,
    lastUpdated:    0,
  };
}

export function BoatView({ seats, outlierSeat, isSimulated: _isSimulated }: BoatViewProps) {
  return (
    <div className="space-y-3">
      {/* COX indicator */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2">
        <div className="h-2 w-2 rounded-full bg-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Cox Box
        </span>
        <span className="ml-auto text-xs text-muted-foreground">Stern →</span>
      </div>

      {/* 8 seat cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SEAT_ORDER.map((seatNumber) => {
          const seat  = seats.find((s) => s.seatNumber === seatNumber) ?? makeDefaultSeat(seatNumber);
          const color = SEAT_COLORS[seatNumber] ?? "#888";
          const label = SEAT_LABELS[seatNumber] ?? `Seat ${seatNumber}`;
          return (
            <SeatCard
              key={seatNumber}
              seat={seat}
              isOutlier={seatNumber === outlierSeat}
              color={color}
              label={label}
            />
          );
        })}
      </div>

      {/* Bow label */}
      <div className="text-right">
        <span className="text-xs text-muted-foreground">← Bow</span>
      </div>
    </div>
  );
}
