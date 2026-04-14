"use client";

import { useState } from "react";
import type { CreateProfileBody, Profile } from "@/types";

// =============================================================================
// RowerForm — Create/edit rower profile. Photo upload to Supabase storage.
// =============================================================================

interface RowerFormProps {
  initial?:  Partial<Profile>;
  onSubmit:  (body: CreateProfileBody) => Promise<void>;
  isSaving:  boolean;
  onCancel?: () => void;
}

export function RowerForm({ initial, onSubmit, isSaving, onCancel }: RowerFormProps) {
  const [name,     setName]     = useState(initial?.name     ?? "");
  const [side,     setSide]     = useState<"port" | "starboard" | "">(initial?.side ?? "");
  const [heightCm, setHeightCm] = useState<string>(initial?.height_cm?.toString() ?? "");
  const [weightKg, setWeightKg] = useState<string>(initial?.weight_kg?.toString() ?? "");
  const [notes,    setNotes]    = useState(initial?.notes    ?? "");
  const [photoUrl, setPhotoUrl] = useState(initial?.photo_url ?? "");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const body: CreateProfileBody = {
      name:       name.trim(),
      side:       side || undefined,
      height_cm:  heightCm ? parseInt(heightCm, 10) : undefined,
      weight_kg:  weightKg ? parseInt(weightKg, 10) : undefined,
      notes:      notes.trim() || undefined,
      photo_url:  photoUrl.trim() || undefined,
    };
    await onSubmit(body);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Name */}
        <div className="col-span-2 space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Name *
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Side */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Side
          </label>
          <select
            value={side}
            onChange={(e) => setSide(e.target.value as "port" | "starboard" | "")}
            className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Unknown</option>
            <option value="port">Port</option>
            <option value="starboard">Starboard</option>
          </select>
        </div>

        {/* Height */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Height (cm)
          </label>
          <input
            type="number"
            min={100}
            max={250}
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Weight */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Weight (kg)
          </label>
          <input
            type="number"
            min={30}
            max={200}
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Photo URL */}
        <div className="col-span-2 space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Photo URL (Supabase Storage)
          </label>
          <input
            type="url"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Notes */}
        <div className="col-span-2 space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={2000}
            className="w-full resize-none rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSaving || !name.trim()}
          className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? "Saving…" : initial ? "Save Changes" : "Create Rower"}
        </button>
      </div>
    </form>
  );
}
