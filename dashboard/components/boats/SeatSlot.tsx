"use client";

import Image from "next/image";
import { SEAT_COLORS, SEAT_LABELS } from "@/constants/seatColors";
import type { SeatSlotProps } from "@/types";

// =============================================================================
// SeatSlot — Individual seat slot with rower picker and device picker.
// =============================================================================

export function SeatSlot({ seatNumber, seat, profiles, devices, onAssign }: SeatSlotProps) {
  const color   = SEAT_COLORS[seatNumber] ?? "#888";
  const label   = SEAT_LABELS[seatNumber] ?? `Seat ${seatNumber}`;
  const profile = seat?.profile ?? null;
  const device  = seat?.device  ?? null;

  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      {/* Seat label */}
      <div className="w-16 flex-shrink-0">
        <span className="text-xs font-semibold" style={{ color }}>{label}</span>
      </div>

      {/* Rower avatar + picker */}
      <div className="flex flex-1 items-center gap-2">
        <div className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded-full bg-secondary">
          {profile?.photo_url ? (
            <Image src={profile.photo_url} alt={profile.name} fill className="object-cover" sizes="28px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
              {profile ? profile.name[0]?.toUpperCase() : "+"}
            </div>
          )}
        </div>
        <select
          value={seat?.profile_id ?? ""}
          onChange={(e) =>
            onAssign(seatNumber, e.target.value || null, seat?.device_mac ?? null)
          }
          className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label={`Assign rower to ${label}`}
        >
          <option value="">No rower</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Device picker */}
      <select
        value={seat?.device_mac ?? ""}
        onChange={(e) =>
          onAssign(seatNumber, seat?.profile_id ?? null, e.target.value || null)
        }
        className="w-32 rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        aria-label={`Assign device to ${label}`}
      >
        <option value="">No sensor</option>
        {devices.map((d) => (
          <option key={d.mac_address} value={d.mac_address}>
            {d.name ?? d.mac_address.slice(-5)}
          </option>
        ))}
      </select>
    </div>
  );
}
