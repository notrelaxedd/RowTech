"use client";

import { useRowTech }      from "@/hooks/useRowTech";
import { useSession }      from "@/hooks/useSession";
import { BoatView }        from "@/components/dashboard/BoatView";
import { CrewStats }       from "@/components/dashboard/CrewStats";
import { TimingSpread }    from "@/components/dashboard/TimingSpread";
import { OverlayChart }    from "@/components/dashboard/OverlayChart";
import { SEAT_COLORS }     from "@/constants/seatColors";

// =============================================================================
// Live Dashboard Page (/)
// =============================================================================

export default function LivePage() {
  const { activeSession } = useSession();
  const { crewState, outlierSeatNumber, isLive: _isLive, isSimulated } = useRowTech(
    activeSession?.id ?? null,
  );

  return (
    <div className="space-y-6">
      {/* Crew aggregates */}
      <CrewStats crewState={crewState} isSimulated={isSimulated} />

      {/* Timing spread visualization */}
      <TimingSpread
        seats={crewState.seats}
        outlierSeat={outlierSeatNumber}
        colors={SEAT_COLORS}
      />

      {/* Live overlay chart */}
      <OverlayChart
        seats={crewState.seats}
        outlierSeat={outlierSeatNumber}
      />

      {/* 8 seat cards */}
      <BoatView
        seats={crewState.seats}
        outlierSeat={outlierSeatNumber}
        isSimulated={isSimulated}
      />
    </div>
  );
}
