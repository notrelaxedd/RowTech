"use client";

import {
  useState, useCallback, useContext, createContext, type ReactNode,
} from "react";
import type { Session } from "@/types";

// =============================================================================
// Session Context — shared across the entire dashboard layout.
// useSession() anywhere under <SessionProvider> reads the same state.
// =============================================================================

interface SessionState {
  activeSession: Session | null;
  isStarting:    boolean;
  isEnding:      boolean;
  error:         string | null;
  startSession:  (boatId: string) => Promise<Session | null>;
  endSession:    (sessionId: string, notes?: string) => Promise<void>;
  clearSession:  () => void;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [isStarting,    setIsStarting]    = useState(false);
  const [isEnding,      setIsEnding]      = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const startSession = useCallback(async (boatId: string): Promise<Session | null> => {
    setIsStarting(true);
    setError(null);
    try {
      const res  = await fetch("/api/sessions", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ boat_id: boatId }),
      });
      const json = await res.json() as { ok: boolean; data?: Session; error?: string };
      if (!json.ok || !json.data) {
        setError(json.error ?? "Failed to start session");
        return null;
      }
      setActiveSession(json.data);
      return json.data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      return null;
    } finally {
      setIsStarting(false);
    }
  }, []);

  const endSession = useCallback(async (sessionId: string, notes?: string): Promise<void> => {
    setIsEnding(true);
    setError(null);
    const endedAt   = new Date().toISOString();
    const startedAt = activeSession?.started_at
      ? new Date(activeSession.started_at).getTime()
      : Date.now();
    const duration  = Math.round((Date.now() - startedAt) / 1000);
    try {
      const res  = await fetch(`/api/sessions/${sessionId}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ended_at: endedAt, duration, notes }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (!json.ok) {
        setError(json.error ?? "Failed to end session");
        return;
      }
      setActiveSession(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setIsEnding(false);
    }
  }, [activeSession]);

  const clearSession = useCallback(() => {
    setActiveSession(null);
    setError(null);
  }, []);

  return (
    <SessionContext.Provider
      value={{ activeSession, isStarting, isEnding, error, startSession, endSession, clearSession }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within <SessionProvider>");
  return ctx;
}
