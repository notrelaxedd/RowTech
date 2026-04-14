import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { createSessionSchema } from "@/lib/zodSchemas";
import { ok, err } from "@/lib/apiResponse";
import type { SessionWithMeta } from "@/types";

// =============================================================================
// GET  /api/sessions — List sessions with boat name and rower count
// POST /api/sessions — Create a new session (requires boat_id)
// =============================================================================

export async function GET() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("sessions")
    .select(`
      *,
      boats ( name )
    `)
    .order("started_at", { ascending: false });

  if (error) {
    return err("Failed to fetch sessions", 500);
  }

  // Get rower count per session by counting distinct seat assignments
  const sessionIds = (data ?? []).map((s) => s.id);

  const { data: strokeCounts } = await supabase
    .from("strokes")
    .select("session_id, seat_number")
    .in("session_id", sessionIds);

  const rowerCountMap: Record<string, Set<number>> = {};
  for (const row of strokeCounts ?? []) {
    if (!row.session_id || row.seat_number === null) continue;
    if (!rowerCountMap[row.session_id]) {
      rowerCountMap[row.session_id] = new Set();
    }
    rowerCountMap[row.session_id]!.add(row.seat_number);
  }

  const sessions: SessionWithMeta[] = (data ?? []).map((s) => ({
    id:          s.id,
    boat_id:     s.boat_id,
    started_at:  s.started_at,
    ended_at:    s.ended_at,
    duration:    s.duration,
    avg_rate:    s.avg_rate,
    notes:       s.notes,
    created_at:  s.created_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    boat_name:   (s as any).boats?.name ?? null,
    rower_count: rowerCountMap[s.id]?.size ?? 0,
  }));

  return ok(sessions);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON", 400);
  }

  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.errors[0]?.message ?? "Invalid request body", 400);
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      boat_id:    parsed.data.boat_id,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return err("Failed to create session", 500);
  }

  return ok(data, 201);
}
