"use client";

import { useState, useEffect } from "react";
import { SessionList }         from "@/components/sessions/SessionList";
import type { SessionWithMeta } from "@/types";

// =============================================================================
// Sessions List Page (/sessions)
// =============================================================================

export default function SessionsPage() {
  const [sessions,  setSessions]  = useState<SessionWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json() as Promise<{ ok: boolean; data?: SessionWithMeta[]; error?: string }>)
      .then((j) => {
        if (j.ok && j.data) setSessions(j.data);
        else setError(j.error ?? "Failed to load sessions");
      })
      .catch(() => setError("Network error"))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">Sessions</h1>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : error ? (
        <div className="text-sm text-destructive">{error}</div>
      ) : (
        <SessionList sessions={sessions} />
      )}
    </div>
  );
}
