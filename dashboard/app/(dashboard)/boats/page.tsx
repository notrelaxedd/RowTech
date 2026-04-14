"use client";

import { useState } from "react";
import { useBoats }    from "@/hooks/useBoats";
import { useProfiles } from "@/hooks/useProfiles";
import { useDevices }  from "@/hooks/useDevices";
import { BoatList }    from "@/components/boats/BoatList";
import { BoatEditor }  from "@/components/boats/BoatEditor";
import type { UpdateSeatAssignment } from "@/types";

// =============================================================================
// Boats Page (/boats)
// =============================================================================

export default function BoatsPage() {
  const { boats, isLoading, error, createBoat, updateBoat } = useBoats();
  const { profiles } = useProfiles();
  const { devices }  = useDevices();

  const [selectedBoatId, setSelectedBoatId] = useState<string | null>(null);
  const [isSaving,       setIsSaving]       = useState(false);
  const [newBoatName,    setNewBoatName]    = useState("");
  const [creating,       setCreating]       = useState(false);

  const selectedBoat = boats.find((b) => b.id === selectedBoatId) ?? null;

  const handleSaveSeats = async (boatId: string, seats: UpdateSeatAssignment[]) => {
    setIsSaving(true);
    await updateBoat(boatId, { seats });
    setIsSaving(false);
  };

  const handleCreateBoat = async () => {
    if (!newBoatName.trim()) return;
    setCreating(true);
    const boat = await createBoat(newBoatName.trim());
    if (boat) {
      setNewBoatName("");
      setSelectedBoatId(boat.id);
    }
    setCreating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Boats</h1>

        {/* Create boat form */}
        <div className="flex items-center gap-2">
          <input
            value={newBoatName}
            onChange={(e) => setNewBoatName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleCreateBoat(); }}
            placeholder="New boat name…"
            className="rounded border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            maxLength={100}
          />
          <button
            onClick={handleCreateBoat}
            disabled={creating || !newBoatName.trim()}
            className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {creating ? "Creating…" : "Add Boat"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : error ? (
        <div className="text-sm text-destructive">{error}</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <BoatList
              boats={boats}
              onSelectBoat={setSelectedBoatId}
              selectedId={selectedBoatId}
            />
          </div>
          <div className="lg:col-span-2">
            {selectedBoat ? (
              <BoatEditor
                boat={selectedBoat}
                profiles={profiles}
                devices={devices as import("@/types").Device[]}
                onSave={handleSaveSeats}
                isSaving={isSaving}
              />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">
                Select a boat to edit seat assignments
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
