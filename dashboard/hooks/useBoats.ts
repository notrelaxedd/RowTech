"use client";

import { useState, useEffect, useCallback } from "react";
import type { BoatWithSeats, UpdateBoatBody } from "@/types";

// =============================================================================
// useBoats — Boat data with seat assignments populated
// =============================================================================

interface UseBoatsReturn {
  boats:       BoatWithSeats[];
  isLoading:   boolean;
  error:       string | null;
  createBoat:  (name: string) => Promise<BoatWithSeats | null>;
  updateBoat:  (id: string, body: UpdateBoatBody) => Promise<BoatWithSeats | null>;
  refresh:     () => void;
}

export function useBoats(): UseBoatsReturn {
  const [boats,     setBoats]     = useState<BoatWithSeats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [tick,      setTick]      = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetch("/api/boats")
      .then((res) => res.json() as Promise<{ ok: boolean; data?: BoatWithSeats[]; error?: string }>)
      .then((json) => {
        if (cancelled) return;
        if (json.ok && json.data) {
          setBoats(json.data);
          setError(null);
        } else {
          setError(json.error ?? "Failed to load boats");
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

  const createBoat = useCallback(async (name: string): Promise<BoatWithSeats | null> => {
    try {
      const res  = await fetch("/api/boats", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name }),
      });
      const json = await res.json() as { ok: boolean; data?: BoatWithSeats; error?: string };
      if (json.ok && json.data) {
        setTick((t) => t + 1);
        return json.data;
      }
      setError(json.error ?? "Failed to create boat");
      return null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      return null;
    }
  }, []);

  const updateBoat = useCallback(async (id: string, body: UpdateBoatBody): Promise<BoatWithSeats | null> => {
    try {
      const res  = await fetch(`/api/boats/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const json = await res.json() as { ok: boolean; data?: BoatWithSeats; error?: string };
      if (json.ok && json.data) {
        setTick((t) => t + 1);
        return json.data;
      }
      setError(json.error ?? "Failed to update boat");
      return null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      return null;
    }
  }, []);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { boats, isLoading, error, createBoat, updateBoat, refresh };
}
