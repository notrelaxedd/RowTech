"use client";

import { formatElapsed } from "@/lib/utils";
import type { Session } from "@/types";

// =============================================================================
// Header — Live/offline badge, session timer, start/stop session button.
// =============================================================================

interface HeaderProps {
  activeSession:  Session | null;
  isLive:         boolean;
  isSimulated:    boolean;
  sessionTime:    number;    // elapsed ms
  onStartSession: () => void;
  onEndSession:   () => void;
  isStarting:     boolean;
  isEnding:       boolean;
}

export function Header({
  activeSession,
  isLive,
  isSimulated,
  sessionTime,
  onStartSession,
  onEndSession,
  isStarting,
  isEnding,
}: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-3">
        {/* Live / Offline / Simulation status */}
        {activeSession && isLive && !isSimulated ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Live
          </span>
        ) : activeSession && isSimulated ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Awaiting sensors
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-muted-foreground" />
            No session
          </span>
        )}

        {/* Session timer */}
        {activeSession && (
          <span className="font-mono text-sm tabular-nums text-foreground">
            {formatElapsed(sessionTime)}
          </span>
        )}
      </div>

      {/* Session control */}
      <div>
        {activeSession ? (
          <button
            onClick={onEndSession}
            disabled={isEnding}
            className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEnding ? "Ending…" : "End Session"}
          </button>
        ) : (
          <button
            onClick={onStartSession}
            disabled={isStarting}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isStarting ? "Starting…" : "Start Session"}
          </button>
        )}
      </div>
    </header>
  );
}
