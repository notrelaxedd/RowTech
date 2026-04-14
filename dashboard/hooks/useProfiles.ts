"use client";

import { useState, useEffect, useCallback } from "react";
import type { Profile, CreateProfileBody, UpdateProfileBody } from "@/types";

// =============================================================================
// useProfiles — Rower profiles CRUD
// =============================================================================

interface UseProfilesReturn {
  profiles:      Profile[];
  isLoading:     boolean;
  error:         string | null;
  createProfile: (body: CreateProfileBody) => Promise<Profile | null>;
  updateProfile: (id: string, body: UpdateProfileBody) => Promise<Profile | null>;
  refresh:       () => void;
}

export function useProfiles(): UseProfilesReturn {
  const [profiles,  setProfiles]  = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [tick,      setTick]      = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetch("/api/profiles")
      .then((res) => res.json() as Promise<{ ok: boolean; data?: Profile[]; error?: string }>)
      .then((json) => {
        if (cancelled) return;
        if (json.ok && json.data) {
          setProfiles(json.data);
          setError(null);
        } else {
          setError(json.error ?? "Failed to load profiles");
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Network error");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [tick]);

  const createProfile = useCallback(async (body: CreateProfileBody): Promise<Profile | null> => {
    try {
      const res  = await fetch("/api/profiles", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const json = await res.json() as { ok: boolean; data?: Profile; error?: string };
      if (json.ok && json.data) {
        setTick((t) => t + 1);
        return json.data;
      }
      setError(json.error ?? "Failed to create profile");
      return null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      return null;
    }
  }, []);

  const updateProfile = useCallback(async (id: string, body: UpdateProfileBody): Promise<Profile | null> => {
    try {
      const res  = await fetch(`/api/profiles/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const json = await res.json() as { ok: boolean; data?: Profile; error?: string };
      if (json.ok && json.data) {
        setTick((t) => t + 1);
        return json.data;
      }
      setError(json.error ?? "Failed to update profile");
      return null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      return null;
    }
  }, []);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { profiles, isLoading, error, createProfile, updateProfile, refresh };
}
