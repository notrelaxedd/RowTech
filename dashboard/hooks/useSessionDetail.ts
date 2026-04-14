"use client";

import { useState, useEffect } from "react";
import type { SessionDetail } from "@/types";

// =============================================================================
// useSessionDetail — Full session data with strokes grouped by seat
// =============================================================================

interface UseSessionDetailReturn {
  session:   SessionDetail | null;
  isLoading: boolean;
  error:     string | null;
}

export function useSessionDetail(sessionId: string | null): UseSessionDetailReturn {
  const [session,   setSession]   = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(`/api/sessions/${sessionId}`)
      .then((res) => res.json() as Promise<{ ok: boolean; data?: SessionDetail; error?: string }>)
      .then((json) => {
        if (cancelled) return;
        if (json.ok && json.data) {
          setSession(json.data);
        } else {
          setError(json.error ?? "Failed to load session");
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Network error");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [sessionId]);

  return { session, isLoading, error };
}
