import Link from "next/link";
import { formatDate, formatDuration } from "@/lib/utils";
import type { SessionCardProps } from "@/types";

// =============================================================================
// SessionCard — Summary card for a past session.
// =============================================================================

export function SessionCard({ session }: SessionCardProps) {
  const duration = session.duration ? formatDuration(session.duration) : "In Progress";

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:border-muted transition-colors">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">
          {session.boat_name ?? "Unknown Boat"}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatDate(session.started_at)}
        </span>
      </div>

      <div className="hidden gap-6 text-center sm:flex">
        <div>
          <div className="text-sm font-semibold tabular-nums text-foreground">{duration}</div>
          <div className="text-xs text-muted-foreground">Duration</div>
        </div>
        <div>
          <div className="text-sm font-semibold tabular-nums text-foreground">
            {session.avg_rate ? `${session.avg_rate.toFixed(1)} spm` : "—"}
          </div>
          <div className="text-xs text-muted-foreground">Avg Rate</div>
        </div>
        <div>
          <div className="text-sm font-semibold tabular-nums text-foreground">
            {session.rower_count}
          </div>
          <div className="text-xs text-muted-foreground">Rowers</div>
        </div>
      </div>

      <Link
        href={`/sessions/${session.id}`}
        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        View
      </Link>
    </div>
  );
}
