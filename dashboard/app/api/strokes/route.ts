import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { validateHubSecret } from "@/lib/validateHubSecret";
import { strokePostSchema } from "@/lib/zodSchemas";
import { ok, err } from "@/lib/apiResponse";

// =============================================================================
// POST /api/strokes
// Hub posts a completed stroke summary immediately on each stroke completion.
// Inserts into strokes table, linked to the active session via device_mac.
// Authentication: x-hub-secret header.
// =============================================================================

export async function POST(request: NextRequest) {
  if (!validateHubSecret(request)) {
    return err("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON", 400);
  }

  const parsed = strokePostSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.errors[0]?.message ?? "Invalid request body", 400);
  }

  const s = parsed.data;
  const supabase = createAdminClient();

  // Look up the active session and seat assignment for this MAC
  const { data: telemetryRow } = await supabase
    .from("telemetry")
    .select("session_id, seat_number")
    .eq("device_mac", s.mac)
    .maybeSingle();

  const sessionId  = telemetryRow?.session_id ?? null;
  const seatNumber = telemetryRow?.seat_number ?? null;

  // Look up profile for this seat
  let profileId: string | null = null;
  if (sessionId) {
    const { data: session } = await supabase
      .from("sessions")
      .select("boat_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (session?.boat_id && seatNumber) {
      const { data: seatRow } = await supabase
        .from("boat_seats")
        .select("profile_id")
        .eq("boat_id", session.boat_id)
        .eq("seat_number", seatNumber)
        .maybeSingle();

      profileId = seatRow?.profile_id ?? null;
    }
  }

  const { error: insertErr } = await supabase.from("strokes").insert({
    session_id:          sessionId,
    device_mac:          s.mac,
    seat_number:         seatNumber,
    profile_id:          profileId,
    timestamp:           s.timestamp,
    feather_angle:       s.featherAngle,
    feather_consistency: s.featherConsistency,
    rush_score:          s.rushScore,
    catch_sharpness:     s.catchSharpness,
    stroke_rate:         s.strokeRate,
  });

  if (insertErr) {
    console.error("[/api/strokes] Insert error:", insertErr.message);
    return err("Database error", 500);
  }

  return ok({ inserted: true }, 201);
}
