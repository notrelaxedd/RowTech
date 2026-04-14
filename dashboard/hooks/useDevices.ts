"use client";

import { useState, useEffect, useCallback } from "react";
import type { DeviceWithAssignment } from "@/types";

// =============================================================================
// useDevices — Device list with assignment status
// =============================================================================

interface UseDevicesReturn {
  devices:      DeviceWithAssignment[];
  isLoading:    boolean;
  error:        string | null;
  renameDevice: (mac: string, name: string) => Promise<boolean>;
  refresh:      () => void;
}

export function useDevices(): UseDevicesReturn {
  const [devices,   setDevices]   = useState<DeviceWithAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [tick,      setTick]      = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetch("/api/devices")
      .then((res) => res.json() as Promise<{ ok: boolean; data?: DeviceWithAssignment[]; error?: string }>)
      .then((json) => {
        if (cancelled) return;
        if (json.ok && json.data) {
          setDevices(json.data);
          setError(null);
        } else {
          setError(json.error ?? "Failed to load devices");
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Network error");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [tick]);

  const renameDevice = useCallback(async (mac: string, name: string): Promise<boolean> => {
    try {
      const res  = await fetch(`/api/devices/${encodeURIComponent(mac)}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) {
        setDevices((prev) =>
          prev.map((d) => (d.mac_address === mac ? { ...d, name } : d)),
        );
        return true;
      }
      setError(json.error ?? "Failed to rename device");
      return false;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      return false;
    }
  }, []);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { devices, isLoading, error, renameDevice, refresh };
}
