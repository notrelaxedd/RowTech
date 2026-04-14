import Link from "next/link";
import { formatDate, formatDuration, round } from "@/lib/utils";
import { EmptyState } from "@/components/system/EmptyState";
import type { ProfileSession } from "@/types";

// =============================================================================
// RowerSessionHistory — List of rower's past sessions with per-session metrics.
// =============================================================================

interface RowerSessionHistoryProps {
  sessions: ProfileSession[];
}

export function RowerSessionHistory({ sessions }: RowerSessionHistoryProps) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No session history"
        description="This rower has not participated in any recorded sessions yet."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="bg-secondary px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Session History
      </div>
      <div className="divide-y divide-border">
        {sessions.map(({ session, boat_name, avg_feather, avg_rush, avg_catch, avg_stroke_rate, stroke_count }) => (
          <Link
            key={session.id}
            href={`/sessions/${session.id}`}
            className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-secondary/50"
          >
            <div>
              <div className="text-sm font-medium text-foreground">
                {boat_name ?? "Unknown Boat"}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDate(session.started_at)}
                {session.duration && ` · ${formatDuration(session.duration)}`}
                {` · ${stroke_count} strokes`}
              </div>
            </div>
            <div className="flex gap-4 text-xs tabular-nums">
              {avg_feather !== null && (
                <span className="text-muted-foreground">
                  <span className="font-medium text-foreground">{round(avg_feather, 1)}°</span> feather
                </span>
              )}
              {avg_rush !== null && (
                <span className="text-muted-foreground">
                  <span className="font-medium text-foreground">{round(avg_rush, 2)}</span> rush
                </span>
              )}
              {avg_stroke_rate !== null && (
                <span className="text-muted-foreground">
                  <span className="font-medium text-foreground">{round(avg_stroke_rate, 1)}</span> spm
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
