"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { DeviceCardProps } from "@/types";

// =============================================================================
// DeviceCard — Device info with inline rename, battery, assignment status.
// =============================================================================

export function DeviceCard({ device, onRename }: DeviceCardProps) {
  const [editing,   setEditing]   = useState(false);
  const [nameInput, setNameInput] = useState(device.name ?? "");
  const [saving,    setSaving]    = useState(false);

  const isOnline = device.last_seen
    ? Date.now() - new Date(device.last_seen).getTime() < 10000
    : false;

  const handleSave = async () => {
    if (!nameInput.trim()) return;
    setSaving(true);
    await onRename(device.mac_address, nameInput.trim());
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSave();
                  if (e.key === "Escape") setEditing(false);
                }}
                className="rounded border border-ring bg-background px-2 py-0.5 text-sm text-foreground focus:outline-none"
                maxLength={100}
              />
              <button onClick={handleSave} disabled={saving} className="text-emerald-400 hover:text-emerald-300">
                <Check size={14} />
              </button>
              <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-foreground">
                {device.name ?? "Unnamed Sensor"}
              </span>
              <button
                onClick={() => {
                  setNameInput(device.name ?? "");
                  setEditing(true);
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Rename device"
              >
                <Pencil size={12} />
              </button>
            </div>
          )}
          <span className="font-mono text-xs text-muted-foreground">
            {device.mac_address}
          </span>
        </div>

        {/* Online indicator */}
        <div className="flex items-center gap-1 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-400" : "bg-muted-foreground"}`}
          />
          <span className={isOnline ? "text-emerald-400" : "text-muted-foreground"}>
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {/* Battery bar */}
      {device.battery_level !== null && (
        <div className="mt-3 space-y-0.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Battery</span>
            <span>{device.battery_level}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${device.battery_level}%`,
                backgroundColor:
                  device.battery_level > 50
                    ? "#22c55e"
                    : device.battery_level > 20
                    ? "#f59e0b"
                    : "#ef4444",
              }}
            />
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        {device.boat_name && (
          <div>
            Assigned to{" "}
            <span className="text-foreground">
              {device.boat_name}
              {device.seat_number ? ` — Seat ${device.seat_number}` : ""}
            </span>
          </div>
        )}
        {device.rower_name && (
          <div>
            Rower: <span className="text-foreground">{device.rower_name}</span>
          </div>
        )}
        {device.last_seen && (
          <div>
            Last seen: <span className="text-foreground">{formatDateTime(device.last_seen)}</span>
          </div>
        )}
        {device.firmware_version && (
          <div>
            Firmware: <span className="font-mono text-foreground">{device.firmware_version}</span>
          </div>
        )}
      </div>
    </div>
  );
}
