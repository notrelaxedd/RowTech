import Image from "next/image";
import type { Profile } from "@/types";

// =============================================================================
// RowerHeader — Large photo, name, side, height, weight, notes.
// =============================================================================

interface RowerHeaderProps {
  profile: Profile;
}

export function RowerHeader({ profile }: RowerHeaderProps) {
  return (
    <div className="flex items-start gap-6 rounded-lg border border-border bg-card p-6">
      {/* Large photo */}
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-full bg-secondary">
        {profile.photo_url ? (
          <Image
            src={profile.photo_url}
            alt={profile.name}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-muted-foreground">
            {profile.name[0]?.toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">{profile.name}</h1>
          {profile.side && (
            <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold capitalize text-primary">
              {profile.side}
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {profile.height_cm && (
            <span>
              <span className="font-medium text-foreground">{profile.height_cm}</span> cm
            </span>
          )}
          {profile.weight_kg && (
            <span>
              <span className="font-medium text-foreground">{profile.weight_kg}</span> kg
            </span>
          )}
        </div>

        {profile.notes && (
          <p className="mt-3 text-sm text-muted-foreground">{profile.notes}</p>
        )}
      </div>
    </div>
  );
}
