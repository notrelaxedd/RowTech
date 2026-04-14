import Image from "next/image";
import Link from "next/link";
import { round } from "@/lib/utils";
import type { RowerCardProps } from "@/types";

// =============================================================================
// RowerCard — Rower summary card with career stats.
// =============================================================================

export function RowerCard({ profile }: RowerCardProps) {
  return (
    <Link
      href={`/rowers/${profile.id}`}
      className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-muted"
    >
      {/* Photo */}
      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-secondary">
        {profile.photo_url ? (
          <Image
            src={profile.photo_url}
            alt={profile.name}
            fill
            className="object-cover"
            sizes="48px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-base font-bold text-muted-foreground">
            {profile.name[0]?.toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{profile.name}</span>
          {profile.side && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground capitalize">
              {profile.side}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{profile.session_count} sessions</span>
          {profile.avg_feather !== null && (
            <span>Feather: {round(profile.avg_feather, 1)}°</span>
          )}
          {profile.avg_rush !== null && (
            <span>Rush: {round(profile.avg_rush, 2)}</span>
          )}
        </div>
      </div>

      <span className="text-xs text-muted-foreground">→</span>
    </Link>
  );
}
