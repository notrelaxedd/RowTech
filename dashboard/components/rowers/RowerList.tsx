import { RowerCard } from "./RowerCard";
import { EmptyState } from "@/components/system/EmptyState";
import type { ProfileWithStats } from "@/types";

// =============================================================================
// RowerList — Grid of rower cards.
// =============================================================================

interface RowerListProps {
  profiles: ProfileWithStats[];
}

export function RowerList({ profiles }: RowerListProps) {
  if (profiles.length === 0) {
    return (
      <EmptyState
        title="No rowers yet"
        description="Create rower profiles and assign them to boat seats."
      />
    );
  }

  return (
    <div className="space-y-2">
      {profiles.map((p) => (
        <RowerCard key={p.id} profile={p} />
      ))}
    </div>
  );
}
