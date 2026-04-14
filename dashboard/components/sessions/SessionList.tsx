import { SessionCard } from "./SessionCard";
import { EmptyState }  from "@/components/system/EmptyState";
import type { SessionWithMeta } from "@/types";

// =============================================================================
// SessionList — Renders a list of session cards.
// =============================================================================

interface SessionListProps {
  sessions: SessionWithMeta[];
}

export function SessionList({ sessions }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No sessions yet"
        description="Start a session from the live dashboard to begin recording."
      />
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} />
      ))}
    </div>
  );
}
