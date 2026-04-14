"use client";

import { useState } from "react";
import { SeatSlot } from "./SeatSlot";
import { SEAT_ORDER } from "@/constants/seatColors";
import type { BoatWithSeats, BoatSeatPopulated, Profile, Device, UpdateSeatAssignment } from "@/types";

// =============================================================================
// BoatEditor — Visual seat layout with rower/device assignment.
// Coach can choose how many seats are in the boat (1–8).
// =============================================================================

interface BoatEditorProps {
  boat:     BoatWithSeats;
  profiles: Profile[];
  devices:  Device[];
  onSave:   (boatId: string, seats: UpdateSeatAssignment[], seatCount: number) => Promise<void>;
  isSaving: boolean;
}

export function BoatEditor({ boat, profiles, devices, onSave, isSaving }: BoatEditorProps) {
  const [seatCount, setSeatCount] = useState<number>(boat.seat_count ?? 8);

  // Only show the top N seats (stroke seat = highest number)
  const visibleSeats = SEAT_ORDER.filter((n) => n <= seatCount);

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
    // Only save assignments for visible seats
    const seats = visibleSeats.map((n) => assignments[n] ?? { seat_number: n, profile_id: null, device_mac: null });
    void onSave(boat.id, seats, seatCount);
  };

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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted-foreground" htmlFor="seat-count">
              Seats:
            </label>
            <select
              id="seat-count"
              value={seatCount}
              onChange={(e) => setSeatCount(Number(e.target.value))}
              className="rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {[1,2,3,4,5,6,7,8].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {visibleSeats.map((seatNum) => (
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
