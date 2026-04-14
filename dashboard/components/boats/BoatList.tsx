import { EmptyState } from "@/components/system/EmptyState";
import type { BoatWithSeats } from "@/types";

// =============================================================================
// BoatList — Simple boat list with seat count.
// =============================================================================

interface BoatListProps {
  boats:       BoatWithSeats[];
  onSelectBoat: (boatId: string) => void;
  selectedId:  string | null;
}

export function BoatList({ boats, onSelectBoat, selectedId }: BoatListProps) {
  if (boats.length === 0) {
    return (
      <EmptyState
        title="No boats yet"
        description="Create a boat to assign rowers and sensors."
      />
    );
  }

  return (
    <div className="space-y-2">
      {boats.map((boat) => {
        const assigned = (boat.seats ?? []).filter(
          (s) => s.profile_id || s.device_mac,
        ).length;
        const isSelected = boat.id === selectedId;

        return (
          <button
            key={boat.id}
            onClick={() => onSelectBoat(boat.id)}
            className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
              isSelected
                ? "border-primary/50 bg-primary/10"
                : "border-border bg-card hover:border-muted"
            }`}
          >
            <span className="text-sm font-semibold text-foreground">{boat.name}</span>
            <span className="text-xs text-muted-foreground">{assigned}/8 seats assigned</span>
          </button>
        );
      })}
    </div>
  );
}
