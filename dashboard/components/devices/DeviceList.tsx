import { DeviceCard } from "./DeviceCard";
import { EmptyState }  from "@/components/system/EmptyState";
import type { DeviceWithAssignment } from "@/types";

// =============================================================================
// DeviceList — Grid of device cards.
// =============================================================================

interface DeviceListProps {
  devices:  DeviceWithAssignment[];
  onRename: (mac: string, name: string) => Promise<boolean>;
}

export function DeviceList({ devices, onRename }: DeviceListProps) {
  if (devices.length === 0) {
    return (
      <EmptyState
        title="No devices registered"
        description="Power on sensor units and start a session. They will auto-register on first telemetry."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {devices.map((device) => (
        <DeviceCard key={device.mac_address} device={device} onRename={onRename} />
      ))}
    </div>
  );
}
