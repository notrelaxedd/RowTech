"use client";

import { useState } from "react";
import { useRowTech }         from "@/hooks/useRowTech";
import { useSession }         from "@/hooks/useSession";
import { useProfiles }        from "@/hooks/useProfiles";
import { MetricTrendCard }    from "@/components/analytics/MetricTrendCard";
import { SeatComparison }     from "@/components/analytics/SeatComparison";
import { RowerSelector }      from "@/components/analytics/RowerSelector";
import { mean }               from "@/lib/utils";

// =============================================================================
// Analytics Page (/analytics)
// Shows crew-level metric trends and seat comparison.
// Uses live/sim data from useRowTech.
// =============================================================================

export default function AnalyticsPage() {
  const { activeSession }  = useSession();
  const { crewState }      = useRowTech(activeSession?.id ?? null);
  const { profiles }       = useProfiles();
  const [_profileId, setProfileId] = useState<string | null>(null);

  const seats = crewState.seats;

  // Build trend data from seats (for now, sparklines use multi-seat mean history)
  const featherData = seats.map((s) => s.featherAngle);
  const rushData    = seats.map((s) => s.rushScore);
  const catchData   = seats.map((s) => s.catchSharpness);
  const rateData    = seats.map((s) => s.strokeRate);

  const trendFor = (data: number[]) => {
    if (data.length < 2) return "flat" as const;
    const first = data[0] ?? 0;
    const last  = data[data.length - 1] ?? 0;
    const diff  = last - first;
    if (Math.abs(diff) < 0.5) return "flat" as const;
    return diff > 0 ? "up" as const : "down" as const;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Analytics</h1>
        <RowerSelector
          profiles={profiles}
          selectedProfileId={null}
          onChange={setProfileId}
        />
      </div>

      {/* Metric trend cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricTrendCard
          label="Feather Angle"
          value={mean(featherData)}
          unit="°"
          data={featherData}
          color="#0ea5e9"
          trend={trendFor(featherData)}
        />
        <MetricTrendCard
          label="Rush Score"
          value={mean(rushData)}
          unit="/10"
          data={rushData}
          color="#f59e0b"
          trend={trendFor(rushData)}
        />
        <MetricTrendCard
          label="Catch Sharpness"
          value={mean(catchData)}
          unit="ms"
          data={catchData}
          color="#a78bfa"
          trend={trendFor(catchData)}
        />
        <MetricTrendCard
          label="Stroke Rate"
          value={mean(rateData)}
          unit="spm"
          data={rateData}
          color="#22c55e"
          trend={trendFor(rateData)}
        />
      </div>

      {/* Seat comparison bar chart */}
      <SeatComparison seats={seats} />
    </div>
  );
}
