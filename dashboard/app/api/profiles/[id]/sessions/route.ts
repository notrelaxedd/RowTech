import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { ok, err } from "@/lib/apiResponse";
import type { ProfileSession } from "@/types";

// =============================================================================
// GET /api/profiles/[id]/sessions
// Returns all sessions this rower participated in with per-session metrics.
// =============================================================================

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = params;
  const supabase = createAdminClient();

  // Find all strokes for this rower profile
  const { data: strokes, error: strokesErr } = await supabase
    .from("strokes")
    .select("session_id, feather_angle, rush_score, catch_sharpness, stroke_rate")
    .eq("profile_id", id);

  if (strokesErr) return err("Failed to fetch rower strokes", 500);

  if (!strokes || strokes.length === 0) {
    return ok([]);
  }

  // Group metrics by session_id
  const sessionMap = new Map<
    string,
    {
      featherAngles:  number[];
      rushScores:     number[];
      catchSharpness: number[];
      strokeRates:    number[];
    }
  >();

  for (const s of strokes) {
    if (!s.session_id) continue;
    if (!sessionMap.has(s.session_id)) {
      sessionMap.set(s.session_id, {
        featherAngles:  [],
        rushScores:     [],
        catchSharpness: [],
        strokeRates:    [],
      });
    }
    const m = sessionMap.get(s.session_id)!;
    if (s.feather_angle !== null)   m.featherAngles.push(s.feather_angle);
    if (s.rush_score !== null)      m.rushScores.push(s.rush_score);
    if (s.catch_sharpness !== null) m.catchSharpness.push(s.catch_sharpness);
    if (s.stroke_rate !== null)     m.strokeRates.push(s.stroke_rate);
  }

  const sessionIds = Array.from(sessionMap.keys());

  // Fetch session details
  const { data: sessions, error: sessionsErr } = await supabase
    .from("sessions")
    .select(`*, boats ( name )`)
    .in("id", sessionIds)
    .order("started_at", { ascending: false });

  if (sessionsErr) return err("Failed to fetch sessions", 500);

  const avg = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const result: ProfileSession[] = (sessions ?? []).map((session) => {
    const m = sessionMap.get(session.id);
    const strokeCount = strokes.filter((s) => s.session_id === session.id).length;
    return {
      session: {
        id:         session.id,
        boat_id:    session.boat_id,
        started_at: session.started_at,
        ended_at:   session.ended_at,
        duration:   session.duration,
        avg_rate:   session.avg_rate,
        notes:      session.notes,
        created_at: session.created_at,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      boat_name:       (session as any).boats?.name ?? null,
      avg_feather:     m ? avg(m.featherAngles)  : null,
      avg_rush:        m ? avg(m.rushScores)      : null,
      avg_catch:       m ? avg(m.catchSharpness)  : null,
      avg_stroke_rate: m ? avg(m.strokeRates)     : null,
      stroke_count:    strokeCount,
    };
  });

  return ok(result);
}
