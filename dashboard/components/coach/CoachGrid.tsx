import { CoachSeatRow } from "./CoachSeatRow";
import { SEAT_ORDER }   from "@/constants/seatColors";
import type { SeatState } from "@/types";

// =============================================================================
// CoachGrid — All 8 seat rows for coach overview page.
// =============================================================================

interface CoachGridProps {
  seats: SeatState[];
}

export function CoachGrid({ seats }: CoachGridProps) {
  return (
    <div className="space-y-2">
      {SEAT_ORDER.map((seatNum) => {
        const seat = seats.find((s) => s.seatNumber === seatNum);
        if (!seat) return null;
        return <CoachSeatRow key={seatNum} seat={seat} />;
      })}
    </div>
  );
}
