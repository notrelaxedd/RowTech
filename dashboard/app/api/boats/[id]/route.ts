import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { updateBoatSchema } from "@/lib/zodSchemas";
import { ok, err } from "@/lib/apiResponse";

// =============================================================================
// PUT /api/boats/[id] — Update boat name and/or seat assignments
// Seat assignments are replaced atomically (delete existing, insert new).
// =============================================================================

interface RouteParams {
  params: { id: string };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = params;

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

  // Update boat name if provided
  if (parsed.data.name !== undefined) {
    const { error } = await supabase
      .from("boats")
      .update({ name: parsed.data.name })
      .eq("id", id);

    if (error) return err("Failed to update boat name", 500);
  }

  // Replace seat assignments if provided
  if (parsed.data.seats !== undefined) {
    // Delete all existing seat assignments for this boat
    const { error: deleteErr } = await supabase
      .from("boat_seats")
      .delete()
      .eq("boat_id", id);

    if (deleteErr) return err("Failed to clear seat assignments", 500);

    // Insert new assignments (skip seats where both profile and device are null)
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

  return ok(data);
}
