import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { createBoatSchema } from "@/lib/zodSchemas";
import { ok, err } from "@/lib/apiResponse";

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

  return ok(data ?? []);
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
    .insert({ name: parsed.data.name })
    .select()
    .single();

  if (error) return err("Failed to create boat", 500);

  return ok(data, 201);
}
