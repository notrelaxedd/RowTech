"use client";

import { use, useState, useEffect } from "react";
import { useRowerHistory }        from "@/hooks/useRowerHistory";
import { RowerHeader }            from "@/components/rowers/RowerHeader";
import { RowerSessionHistory }    from "@/components/rowers/RowerSessionHistory";
import { RowerMetricCharts }      from "@/components/rowers/RowerMetricCharts";
import { RowerForm }              from "@/components/rowers/RowerForm";
import type { Profile, UpdateProfileBody } from "@/types";

// =============================================================================
// Rower Detail Page (/rowers/[id])
// =============================================================================

interface Props {
  params: Promise<{ id: string }>;
}

export default function RowerDetailPage({ params }: Props) {
  const { id }                        = use(params);
  const { sessions, isLoading, error } = useRowerHistory(id);

  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [loading2, setLoading2] = useState(true);
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    fetch(`/api/profiles`)
      .then((r) => r.json() as Promise<{ ok: boolean; data?: Profile[] }>)
      .then((j) => {
        if (j.ok && j.data) {
          setProfile(j.data.find((p) => p.id === id) ?? null);
        }
      })
      .catch(console.error)
      .finally(() => setLoading2(false));
  }, [id]);

  const handleUpdate = async (body: UpdateProfileBody) => {
    setSaving(true);
    const res  = await fetch(`/api/profiles/${id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    const json = await res.json() as { ok: boolean; data?: Profile };
    if (json.ok && json.data) {
      setProfile(json.data);
      setEditing(false);
    }
    setSaving(false);
  };

  if (loading2) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!profile)  return <div className="text-sm text-muted-foreground">Rower not found.</div>;

  return (
    <div className="space-y-6">
      {editing ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Edit Profile</h2>
          </div>
          <RowerForm
            initial={profile}
            onSubmit={handleUpdate}
            isSaving={saving}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <div className="relative">
          <RowerHeader profile={profile} />
          <button
            onClick={() => setEditing(true)}
            className="absolute right-4 top-4 rounded border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-secondary"
          >
            Edit
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading session history…</div>
      ) : error ? (
        <div className="text-sm text-destructive">{error}</div>
      ) : (
        <>
          <RowerMetricCharts sessions={sessions} />
          <RowerSessionHistory sessions={sessions} />
        </>
      )}
    </div>
  );
}
