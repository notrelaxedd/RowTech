import Image from "next/image";
import { PhaseIndicator } from "@/components/seats/PhaseIndicator";
import { SEAT_COLORS, SEAT_LABELS } from "@/constants/seatColors";
import { round } from "@/lib/utils";
import type { SeatState } from "@/types";

// =============================================================================
// CoachSeatRow — Compact inline row for coach overview.
// =============================================================================

interface CoachSeatRowProps {
  seat: SeatState;
}

export function CoachSeatRow({ seat }: CoachSeatRowProps) {
  const color = SEAT_COLORS[seat.seatNumber] ?? "#888";
  const label = SEAT_LABELS[seat.seatNumber] ?? `Seat ${seat.seatNumber}`;

  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5"
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      {/* Photo */}
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

      {/* Name + label */}
      <div className="w-28 flex-shrink-0">
        <div className="text-sm font-semibold leading-tight text-foreground">
          {seat.rowerName ?? "—"}
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>

      {/* Phase */}
      <div className="w-20">
        <PhaseIndicator phase={seat.phase} />
      </div>

      {/* Metrics */}
      <div className="flex flex-1 items-center justify-between gap-4 text-xs">
        <div className="text-center">
          <div className="font-mono font-semibold tabular-nums text-foreground">
            {round(seat.featherAngle, 1)}°
          </div>
          <div className="text-muted-foreground">Feather</div>
        </div>
        <div className="text-center">
          <div className="font-mono font-semibold tabular-nums text-foreground">
            {round(seat.rushScore, 1)}
          </div>
          <div className="text-muted-foreground">Rush</div>
        </div>
        <div className="text-center">
          <div className="font-mono font-semibold tabular-nums text-foreground">
            {seat.catchSharpness > 0 ? `${seat.catchSharpness}ms` : "—"}
          </div>
          <div className="text-muted-foreground">Catch</div>
        </div>
        <div className="text-center">
          <div className="font-mono font-semibold tabular-nums text-foreground">
            {seat.strokeRate > 0 ? `${seat.strokeRate.toFixed(0)} spm` : "—"}
          </div>
          <div className="text-muted-foreground">Rate</div>
        </div>
      </div>
    </div>
  );
}
