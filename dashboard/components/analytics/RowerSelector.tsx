"use client";

import type { Profile } from "@/types";

// =============================================================================
// RowerSelector — Filter analytics by specific rower.
// =============================================================================

interface RowerSelectorProps {
  profiles:         Profile[];
  selectedProfileId: string | null;
  onChange:          (profileId: string | null) => void;
}

export function RowerSelector({
  profiles,
  selectedProfileId,
  onChange,
}: RowerSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-semibold text-muted-foreground" htmlFor="rower-select">
        Rower:
      </label>
      <select
        id="rower-select"
        value={selectedProfileId ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">All rowers</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
