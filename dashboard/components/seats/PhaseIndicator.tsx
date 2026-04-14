import { PhaseType } from "@/types";
import { cn } from "@/lib/utils";
import type { PhaseIndicatorProps } from "@/types";

// =============================================================================
// PhaseIndicator — Phase badge pill.
// CATCH=blue, DRIVE=teal, FINISH=coral, RECOVERY=amber
// =============================================================================

const PHASE_CONFIG: Record<
  PhaseType,
  { label: string; className: string }
> = {
  [PhaseType.CATCH]:    { label: "Catch",    className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  [PhaseType.DRIVE]:    { label: "Drive",    className: "bg-teal-500/20 text-teal-400 border-teal-500/30" },
  [PhaseType.FINISH]:   { label: "Finish",   className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  [PhaseType.RECOVERY]: { label: "Recovery", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
};

export function PhaseIndicator({ phase }: PhaseIndicatorProps) {
  const config = PHASE_CONFIG[phase] ?? PHASE_CONFIG[PhaseType.RECOVERY];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}
