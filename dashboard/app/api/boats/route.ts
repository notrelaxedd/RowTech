import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { createBoatSchema } from "@/lib/zodSchemas";
import { ok, err } from "@/lib/apiResponse";
import type { BoatSeatPopulated, BoatWithSeats } from "@/types";

// =============================================================================
// GET  /api/boats — List all boats with seat assignments populated
// POST /api/boats — Create a new boat
// =============================================================================

export async function GET() {
  const supabase = createAdminClient();

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
    .order("created_at", { ascending: false });

  if (error) return err("Failed to fetch boats", 500);

  // Remap boat_seats → seats to match BoatWithSeats type
  const boats: BoatWithSeats[] = (data ?? []).map((b) => ({
    id:         b.id,
    name:       b.name,
    seat_count: b.seat_count ?? 8,
    created_at: b.created_at,
    seats: ((b.boat_seats ?? []) as BoatSeatPopulated[]),
  }));

  return ok(boats);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON", 400);
  }

  const parsed = createBoatSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.errors[0]?.message ?? "Invalid request body", 400);
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("boats")
    .insert({ name: parsed.data.name, seat_count: parsed.data.seat_count })
    .select()
    .single();

  if (error) return err("Failed to create boat", 500);

  return ok({ ...data, seats: [] }, 201);
}
