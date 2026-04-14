"use client";

import { useState } from "react";
import type { BoatWithSeats } from "@/types";

// =============================================================================
// StartSessionModal — Boat selector + seat assignment confirmation.
// =============================================================================

interface StartSessionModalProps {
  open:         boolean;
  onClose:      () => void;
  boats:        BoatWithSeats[];
  onConfirm:    (boatId: string) => Promise<void>;
  isStarting:   boolean;
}

export function StartSessionModal({
  open,
  onClose,
  boats,
  onConfirm,
  isStarting,
}: StartSessionModalProps) {
  const [selectedBoatId, setSelectedBoatId] = useState<string>("");

  const selectedBoat = boats.find((b) => b.id === selectedBoatId) ?? null;

  if (!open) return null;

  const handleConfirm = async () => {
    if (!selectedBoatId) return;
    await onConfirm(selectedBoatId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Start Session</h2>

        {/* Boat selector */}
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Select Boat
        </label>
        <select
          value={selectedBoatId}
          onChange={(e) => setSelectedBoatId(e.target.value)}
          className="mb-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Choose a boat…</option>
          {boats.map((boat) => (
            <option key={boat.id} value={boat.id}>
              {boat.name}
            </option>
          ))}
        </select>

        {/* Seat assignment preview */}
        {selectedBoat && (
          <div className="mb-4 overflow-hidden rounded-md border border-border">
            <div className="bg-secondary px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Seat Assignments
            </div>
            <div className="divide-y divide-border">
              {[8, 7, 6, 5, 4, 3, 2, 1].map((seatNum) => {
                const seat = selectedBoat.seats?.find(
                  (s) => s.seat_number === seatNum,
                );
                const rowerName  = seat?.profile?.name  ?? "—";
                const deviceMac  = seat?.device_mac ?? "—";
                return (
                  <div
                    key={seatNum}
                    className="flex items-center justify-between px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-foreground">
                      {seatNum === 8 ? "Stroke" : seatNum === 1 ? "Bow" : `Seat ${seatNum}`}
                    </span>
                    <span className="text-muted-foreground">
                      {rowerName}
                      {deviceMac !== "—" && (
                        <span className="ml-2 font-mono text-muted-foreground/60">
                          {deviceMac.slice(-5)}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isStarting}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedBoatId || isStarting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isStarting ? "Starting…" : "Start Session"}
          </button>
        </div>
      </div>
    </div>
  );
}
