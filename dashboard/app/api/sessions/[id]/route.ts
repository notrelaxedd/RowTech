import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { updateSessionSchema } from "@/lib/zodSchemas";
import { ok, err } from "@/lib/apiResponse";
import type { SessionDetail, Stroke } from "@/types";

// =============================================================================
// GET /api/sessions/[id] — Full session detail with strokes grouped by seat
// PUT /api/sessions/[id] — Update end time, duration, notes, avg_rate
// =============================================================================

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = params;
  const supabase = createAdminClient();

  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .select(`
      *,
      boats (
        id, name, created_at
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (sessionErr) return err("Failed to fetch session", 500);
  if (!session)   return err("Session not found", 404);

  // Fetch seat assignments for this session's boat
  const boatId = session.boat_id;
  const { data: seats } = boatId
    ? await supabase
        .from("boat_seats")
        .select(`
          *,
          profiles ( * ),
          devices:device_mac ( * )
        `)
        .eq("boat_id", boatId)
    : { data: [] };

  // Fetch all strokes for this session
  const { data: strokes, error: strokesErr } = await supabase
    .from("strokes")
    .select("*")
    .eq("session_id", id)
    .order("timestamp", { ascending: true });

  if (strokesErr) return err("Failed to fetch strokes", 500);

  // Group strokes by seat_number
  const strokesBySeat: Record<number, Stroke[]> = {};
  for (const stroke of strokes ?? []) {
    const seat = stroke.seat_number ?? 0;
    if (!strokesBySeat[seat]) strokesBySeat[seat] = [];
    strokesBySeat[seat]!.push(stroke as Stroke);
  }

  const detail: SessionDetail = {
    id:              session.id,
    boat_id:         session.boat_id,
    started_at:      session.started_at,
    ended_at:        session.ended_at,
    duration:        session.duration,
    avg_rate:        session.avg_rate,
    notes:           session.notes,
    created_at:      session.created_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    boat:            (session as any).boats ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    seats:           (seats ?? []) as any,
    strokes_by_seat: strokesBySeat,
  };

  return ok(detail);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON", 400);
  }

  const parsed = updateSessionSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.errors[0]?.message ?? "Invalid request body", 400);
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("sessions")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return err("Failed to update session", 500);
  if (!data)  return err("Session not found", 404);

  return ok(data);
}
