import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { updateBoatSchema } from "@/lib/zodSchemas";
import { ok, err } from "@/lib/apiResponse";
import type { BoatSeatPopulated, BoatWithSeats } from "@/types";

// =============================================================================
// PUT /api/boats/[id] — Update boat name, seat_count, and/or seat assignments.
// Seat assignments are replaced atomically (delete existing, insert new).
// =============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON", 400);
  }

  const parsed = updateBoatSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.errors[0]?.message ?? "Invalid request body", 400);
  }

  const supabase = createAdminClient();

  // Update boat fields if provided
  const boatUpdate: Record<string, unknown> = {};
  if (parsed.data.name       !== undefined) boatUpdate.name       = parsed.data.name;
  if (parsed.data.seat_count !== undefined) boatUpdate.seat_count = parsed.data.seat_count;

  if (Object.keys(boatUpdate).length > 0) {
    const { error } = await supabase
      .from("boats")
      .update(boatUpdate)
      .eq("id", id);

    if (error) return err("Failed to update boat", 500);
  }

  // Replace seat assignments if provided
  if (parsed.data.seats !== undefined) {
    const { error: deleteErr } = await supabase
      .from("boat_seats")
      .delete()
      .eq("boat_id", id);

    if (deleteErr) return err("Failed to clear seat assignments", 500);

    const newSeats = parsed.data.seats
      .filter((s) => s.profile_id !== null || s.device_mac !== null)
      .map((s) => ({
        boat_id:     id,
        seat_number: s.seat_number,
        profile_id:  s.profile_id,
        device_mac:  s.device_mac,
      }));

    if (newSeats.length > 0) {
      const { error: insertErr } = await supabase
        .from("boat_seats")
        .insert(newSeats);

      if (insertErr) return err("Failed to insert seat assignments", 500);
    }
  }

  // Return updated boat with seats
  const { data, error } = await supabase
    .from("boats")
    .select(`
      *,
      boat_seats (
        id, seat_number, profile_id, device_mac,
        profiles ( * ),
        devices:device_mac ( * )
      )
    `)
    .eq("id", id)
    .single();

  if (error) return err("Failed to fetch updated boat", 500);
  if (!data)  return err("Boat not found", 404);

  const boat: BoatWithSeats = {
    id:         data.id,
    name:       data.name,
    seat_count: data.seat_count ?? 8,
    created_at: data.created_at,
    seats: ((data.boat_seats ?? []) as BoatSeatPopulated[]),
  };

  return ok(boat);
}
