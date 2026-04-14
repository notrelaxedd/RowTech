import type { CrewStatsProps } from "@/types";
import { round } from "@/lib/utils";

// =============================================================================
// CrewStats — 4 metric cards: Rate, Feather, Rush, Timing Spread.
// =============================================================================

interface MetricCardProps {
  label:    string;
  value:    string;
  unit:     string;
  dimmed?:  boolean;
}

function MetricCard({ label, value, unit, dimmed }: MetricCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className={`flex items-baseline gap-1.5 ${dimmed ? "opacity-50" : ""}`}>
        <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
          {value}
        </span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

export function CrewStats({ crewState, isSimulated }: CrewStatsProps) {
  const { avgStrokeRate, avgFeatherAngle, avgRushScore, timingSpread } = crewState;
  const noData = !isSimulated && crewState.seats.every((s) => !s.isConnected);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard
        label="Crew Rate"
        value={noData ? "—" : round(avgStrokeRate, 1).toString()}
        unit="spm"
        dimmed={noData}
      />
      <MetricCard
        label="Avg Feather"
        value={noData ? "—" : round(avgFeatherAngle, 1).toString()}
        unit="°"
        dimmed={noData}
      />
      <MetricCard
        label="Avg Rush"
        value={noData ? "—" : round(avgRushScore, 2).toString()}
        unit="/ 10"
        dimmed={noData}
      />
      <MetricCard
        label="Timing Spread"
        value={noData ? "—" : Math.round(timingSpread).toString()}
        unit="ms"
        dimmed={noData}
      />
    </div>
  );
}
