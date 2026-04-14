"use client";

import { useRowTech }  from "@/hooks/useRowTech";
import { useSession }  from "@/hooks/useSession";
import { CoachGrid }   from "@/components/coach/CoachGrid";
import { SimulationBanner } from "@/components/system/SimulationBanner";

// =============================================================================
// Coach Page (/coach)
// Compact all-seat overview for coxswain / coaching tablet.
// =============================================================================

export default function CoachPage() {
  const { activeSession }  = useSession();
  const { crewState, isSimulated, outlierSeatNumber } = useRowTech(
    activeSession?.id ?? null,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Coach View</h1>
        {outlierSeatNumber && (
          <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
            Seat {outlierSeatNumber} is outlier
          </span>
        )}
      </div>

      <CoachGrid seats={crewState.seats} />
    </div>
  );
}
