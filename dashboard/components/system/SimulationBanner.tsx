"use client";

// =============================================================================
// SimulationBanner — Always visible when simulation mode is active.
// This banner is NEVER removed or hidden when isSimulated = true.
// It MUST be impossible to mistake simulated data for live data.
// =============================================================================

interface SimulationBannerProps {
  isSimulated: boolean;
}

export function SimulationBanner({ isSimulated }: SimulationBannerProps) {
  if (!isSimulated) return null;

  return (
    <div
      role="alert"
      aria-label="Simulation mode active — data is not live"
      className="flex items-center justify-center gap-2 bg-amber-500/20 px-4 py-1.5 text-center text-xs font-semibold uppercase tracking-widest text-amber-400"
    >
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
      Simulation Mode — Not Live Data
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
    </div>
  );
}
