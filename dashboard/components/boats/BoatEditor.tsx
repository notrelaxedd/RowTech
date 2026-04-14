"use client";

import { useState } from "react";
import { SeatSlot } from "./SeatSlot";
import { SEAT_ORDER } from "@/constants/seatColors";
import type { BoatWithSeats, BoatSeatPopulated, Profile, Device, UpdateSeatAssignment } from "@/types";

// =============================================================================
// BoatEditor — Visual 8-seat layout with rower and device assignment.
// =============================================================================

interface BoatEditorProps {
  boat:       BoatWithSeats;
  profiles:   Profile[];
  devices:    Device[];
  onSave:     (boatId: string, seats: UpdateSeatAssignment[]) => Promise<void>;
  isSaving:   boolean;
}

export function BoatEditor({ boat, profiles, devices, onSave, isSaving }: BoatEditorProps) {
  // Build a mutable seat map
  const [assignments, setAssignments] = useState<Record<number, UpdateSeatAssignment>>(() => {
    const map: Record<number, UpdateSeatAssignment> = {};
    for (const seatNum of SEAT_ORDER) {
      const existing = boat.seats?.find((s) => s.seat_number === seatNum);
      map[seatNum] = {
        seat_number: seatNum,
        profile_id:  existing?.profile_id  ?? null,
        device_mac:  existing?.device_mac  ?? null,
      };
    }
    return map;
  });

  const handleAssign = (
    seatNumber: number,
    profileId:  string | null,
    deviceMac:  string | null,
  ) => {
    setAssignments((prev) => ({
      ...prev,
      [seatNumber]: { seat_number: seatNumber, profile_id: profileId, device_mac: deviceMac },
    }));
  };

  const handleSave = () => {
    void onSave(boat.id, Object.values(assignments));
  };

  // Build BoatSeatPopulated for SeatSlot
  const makePopulated = (seatNum: number): BoatSeatPopulated | null => {
    const a = assignments[seatNum];
    if (!a) return null;
    return {
      id:          "",
      boat_id:     boat.id,
      seat_number: seatNum,
      profile_id:  a.profile_id,
      device_mac:  a.device_mac,
      profile:     profiles.find((p) => p.id === a.profile_id) ?? null,
      device:      devices.find((d) => d.mac_address === a.device_mac) ?? null,
    };
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">{boat.name}</h3>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
      <div className="space-y-2">
        {SEAT_ORDER.map((seatNum) => (
          <SeatSlot
            key={seatNum}
            seatNumber={seatNum}
            seat={makePopulated(seatNum)}
            profiles={profiles}
            devices={devices}
            onAssign={handleAssign}
          />
        ))}
      </div>
    </div>
  );
}
