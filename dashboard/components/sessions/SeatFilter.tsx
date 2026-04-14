"use client";

import { SEAT_COLORS, SEAT_LABELS, SEAT_ORDER } from "@/constants/seatColors";

// =============================================================================
// SeatFilter — Color-coded seat toggle buttons for session detail view.
// =============================================================================

interface SeatFilterProps {
  activeSeats:  Set<number>;
  onToggle:     (seatNumber: number) => void;
}

export function SeatFilter({ activeSeats, onToggle }: SeatFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SEAT_ORDER.map((seatNum) => {
        const color  = SEAT_COLORS[seatNum] ?? "#888";
        const active = activeSeats.has(seatNum);
        return (
          <button
            key={seatNum}
            onClick={() => onToggle(seatNum)}
            aria-pressed={active}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-opacity"
            style={{
              borderColor: color,
              color:       active ? color : "hsl(215 20% 45%)",
              opacity:     active ? 1 : 0.4,
            }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: active ? color : "hsl(215 20% 35%)" }}
            />
            {SEAT_LABELS[seatNum] ?? `Seat ${seatNum}`}
          </button>
        );
      })}
    </div>
  );
}
