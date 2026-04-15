"use client";

import { useState } from "react";
import { formatElapsed } from "@/lib/utils";
import type { Session } from "@/types";

// =============================================================================
// Header — Live/offline badge, session timer, start/stop session button,
//          hub IP configuration for local WebSocket mode.
// =============================================================================

interface HeaderProps {
  activeSession:      Session | null;
  isLive:             boolean;
  isSimulated:        boolean;
  isLocalStream:      boolean;
  sessionTime:        number;
  onStartSession:     () => void;
  onEndSession:       () => void;
  onToggleSimulation: () => void;
  isStarting:         boolean;
  isEnding:           boolean;
  hubHost:            string;
  onSetHubHost:       (host: string) => void;
}

export function Header({
  activeSession,
  isLive,
  isSimulated,
  isLocalStream,
  sessionTime,
  onStartSession,
  onEndSession,
  onToggleSimulation,
  isStarting,
  isEnding,
  hubHost,
  onSetHubHost,
}: HeaderProps) {
  const [showHubInput, setShowHubInput] = useState(false);
  const [hubInput,     setHubInput]     = useState(hubHost);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-3">
        {/* Stream source badge */}
        {activeSession && isLive && !isSimulated && isLocalStream ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-sky-400"
                title="Connected directly to hub — ~5ms latency">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-400" />
            </span>
            Local
          </span>
        ) : activeSession && isLive && !isSimulated ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400"
                title="Connected via cloud — ~50ms latency">
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

      <div className="flex items-center gap-2">
        {/* Hub IP configurator */}
        {showHubInput ? (
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              onSetHubHost(hubInput);
              setShowHubInput(false);
            }}
          >
            <input
              autoFocus
              value={hubInput}
              onChange={(e) => setHubInput(e.target.value)}
              placeholder="rowtech.local or 192.168.x.x"
              className="w-44 rounded-md border border-input bg-background px-2 py-1 font-mono text-xs text-foreground focus:border-ring focus:outline-none"
            />
            <button type="submit"
              className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-white hover:opacity-90">
              Save
            </button>
            <button type="button" onClick={() => setShowHubInput(false)}
              className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
              ✕
            </button>
          </form>
        ) : (
          <button
            onClick={() => { setHubInput(hubHost); setShowHubInput(true); }}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
              isLocalStream
                ? "border-sky-500/50 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20"
                : "border-border bg-transparent text-muted-foreground hover:text-foreground"
            }`}
            title={`Hub: ${hubHost} — click to change`}
          >
            {isLocalStream ? "Local ✓" : "Hub IP"}
          </button>
        )}

        {/* Demo mode toggle */}
        <button
          onClick={onToggleSimulation}
          className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
            isSimulated
              ? "border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
              : "border-border bg-transparent text-muted-foreground hover:text-foreground"
          }`}
          title={isSimulated ? "Exit demo mode" : "Enter demo mode"}
        >
          Demo
        </button>

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
