import Image from "next/image";
import { formatDate, formatDuration } from "@/lib/utils";
import type { SessionDetail } from "@/types";

// =============================================================================
// SessionHeader — Session metadata: boat, date, duration, rower avatars.
// =============================================================================

interface SessionHeaderProps {
  session: SessionDetail;
}

export function SessionHeader({ session }: SessionHeaderProps) {
  const duration = session.duration
    ? formatDuration(session.duration)
    : "In Progress";

  const rowers = (session.seats ?? [])
    .sort((a, b) => b.seat_number - a.seat_number)
    .map((s) => s.profile)
    .filter(Boolean);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {session.boat?.name ?? "Session Detail"}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatDate(session.started_at)}
          </p>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <span>
              <span className="font-semibold text-foreground">{duration}</span>
              <span className="ml-1 text-muted-foreground">duration</span>
            </span>
            {session.avg_rate && (
              <span>
                <span className="font-semibold text-foreground">
                  {session.avg_rate.toFixed(1)} spm
                </span>
                <span className="ml-1 text-muted-foreground">avg rate</span>
              </span>
            )}
          </div>
        </div>

        {/* Rower avatar stack */}
        {rowers.length > 0 && (
          <div className="flex -space-x-2">
            {rowers.slice(0, 8).map((profile) => (
              <div
                key={profile!.id}
                className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-card bg-secondary"
                title={profile!.name}
              >
                {profile!.photo_url ? (
                  <Image
                    src={profile!.photo_url}
                    alt={profile!.name}
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
                    {profile!.name[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {session.notes && (
        <p className="mt-3 rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">
          {session.notes}
        </p>
      )}
    </div>
  );
}
