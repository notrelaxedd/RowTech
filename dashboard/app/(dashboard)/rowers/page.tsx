"use client";

import { useState } from "react";
import { useProfiles }     from "@/hooks/useProfiles";
import { RowerList }       from "@/components/rowers/RowerList";
import { RowerForm }       from "@/components/rowers/RowerForm";
import type { ProfileWithStats, CreateProfileBody } from "@/types";

// =============================================================================
// Rowers List Page (/rowers)
// =============================================================================

export default function RowersPage() {
  const { profiles, isLoading, error, createProfile } = useProfiles();
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);

  // Augment profiles with placeholder stats (real stats would come from an aggregate endpoint)
  const profilesWithStats: ProfileWithStats[] = profiles.map((p) => ({
    ...p,
    session_count: 0,
    avg_feather:   null,
    avg_rush:      null,
  }));

  const handleCreate = async (body: CreateProfileBody) => {
    setSaving(true);
    const result = await createProfile(body);
    setSaving(false);
    if (result) setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Rowers</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            Add Rower
          </button>
        )}
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-sm font-semibold text-foreground">New Rower</h2>
          <RowerForm
            onSubmit={handleCreate}
            isSaving={saving}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : error ? (
        <div className="text-sm text-destructive">{error}</div>
      ) : (
        <RowerList profiles={profilesWithStats} />
      )}
    </div>
  );
}
