"use client";

import { SEAT_LABELS, SEAT_ORDER } from "@/constants/seatColors";
import type { Device } from "@/types";

// =============================================================================
// DeviceAssigner — Assign a device MAC to a boat seat via dropdown.
// =============================================================================

interface DeviceAssignerProps {
  seatNumber:         number;
  boatId:             string;
  devices:            Device[];
  currentDeviceMac:   string | null;
  onAssign:           (boatId: string, seatNumber: number, mac: string | null) => Promise<void>;
}

export function DeviceAssigner({
  seatNumber,
  boatId,
  devices,
  currentDeviceMac,
  onAssign,
}: DeviceAssignerProps) {
  const seatLabel = SEAT_LABELS[seatNumber] ?? `Seat ${seatNumber}`;

  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-xs font-medium text-muted-foreground">{seatLabel}</span>
      <select
        value={currentDeviceMac ?? ""}
        onChange={(e) => void onAssign(boatId, seatNumber, e.target.value || null)}
        className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        aria-label={`Assign device to ${seatLabel}`}
      >
        <option value="">No device</option>
        {devices.map((d) => (
          <option key={d.mac_address} value={d.mac_address}>
            {d.name ?? d.mac_address}
          </option>
        ))}
      </select>
    </div>
  );
}
