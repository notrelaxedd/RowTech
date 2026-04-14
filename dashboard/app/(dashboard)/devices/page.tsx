"use client";

import { useDevices } from "@/hooks/useDevices";
import { DeviceList } from "@/components/devices/DeviceList";

// =============================================================================
// Devices Page (/devices)
// =============================================================================

export default function DevicesPage() {
  const { devices, isLoading, error, renameDevice } = useDevices();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">Devices</h1>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : error ? (
        <div className="text-sm text-destructive">{error}</div>
      ) : (
        <DeviceList devices={devices} onRename={renameDevice} />
      )}
    </div>
  );
}
