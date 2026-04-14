"use client";

import { useState, useEffect } from "react";
import type { ProfileSession } from "@/types";

// =============================================================================
// useRowerHistory — Career metric trends for a single rower profile
// =============================================================================

interface UseRowerHistoryReturn {
  sessions:  ProfileSession[];
  isLoading: boolean;
  error:     string | null;
}

export function useRowerHistory(profileId: string | null): UseRowerHistoryReturn {
  const [sessions,  setSessions]  = useState<ProfileSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) {
      setSessions([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(`/api/profiles/${profileId}/sessions`)
      .then((res) => res.json() as Promise<{ ok: boolean; data?: ProfileSession[]; error?: string }>)
      .then((json) => {
        if (cancelled) return;
        if (json.ok && json.data) {
          setSessions(json.data);
        } else {
          setError(json.error ?? "Failed to load rower history");
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Network error");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [profileId]);

  return { sessions, isLoading, error };
}
