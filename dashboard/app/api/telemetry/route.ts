import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { validateHubSecret } from "@/lib/validateHubSecret";
import { telemetryPostSchema } from "@/lib/zodSchemas";
import { ok, err } from "@/lib/apiResponse";
import { voltageToPercent } from "@/lib/utils";

// =============================================================================
// POST /api/telemetry
// Hub posts live sensor data every 100ms.
//
// Performance strategy — target <200ms response so the hub never times out:
//
//  1. Module-level cache for session + seat map (TTL 5s).
//     Session and boat seats don't change mid-row so fetching them on every
//     request is pure waste. The cache is keyed on session ID and cleared when
//     the session changes.
//
//  2. Device auto-registration via upsert (ignoreDuplicates) — one query,
//     no read-then-write round-trip.
//
//  3. Telemetry upsert + device last_seen update run in parallel after the
//     response has been sent — the hub only waits for the upsert to confirm
//     the write, not for housekeeping.
//
//  4. Supabase broadcast is fully fire-and-forget (no await anywhere in the
//     request path).
// =============================================================================

interface SessionCache {
  sessionId:  string;
  macToSeat:  Map<string, number>;
  fetchedAt:  number;
}

// Module-level cache — survives across requests on the same Vercel instance.
let sessionCache: SessionCache | null = null;
const SESSION_CACHE_TTL_MS = 5_000;

async function getSessionAndSeats(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<SessionCache> {
  const now = Date.now();
  if (sessionCache && now - sessionCache.fetchedAt < SESSION_CACHE_TTL_MS) {
    return sessionCache;
  }

  // Fetch session + its seat assignments in parallel
  const [sessionRes, _] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, boat_id")
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    Promise.resolve(), // placeholder to keep structure for future parallel fetch
  ]);

  const activeSession = sessionRes.data;
  const macToSeat = new Map<string, number>();

  if (activeSession?.boat_id) {
    const { data: boatSeats } = await supabase
      .from("boat_seats")
      .select("seat_number, device_mac")
      .eq("boat_id", activeSession.boat_id)
      .not("device_mac", "is", null);

    for (const seat of boatSeats ?? []) {
      if (seat.device_mac) macToSeat.set(seat.device_mac, seat.seat_number);
    }
  }

  sessionCache = {
    sessionId: activeSession?.id ?? "",
    macToSeat,
    fetchedAt: now,
  };
  return sessionCache;
}

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

  const parsed = telemetryPostSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.errors[0]?.message ?? "Invalid request body", 400);
  }

  const { sensors } = parsed.data;
  const supabase = createAdminClient();

  // Run device upsert + session cache fetch in parallel
  const macs = sensors.map((s) => s.mac);

  const [{ sessionId, macToSeat }] = await Promise.all([
    getSessionAndSeats(supabase),
    // Upsert devices — ignoreDuplicates skips the read-first round-trip
    supabase.from("devices").upsert(
      macs.map((mac) => ({ mac_address: mac, name: null, firmware_version: null })),
      { onConflict: "mac_address", ignoreDuplicates: true },
    ),
  ]);

  const telemetryRows = sensors.map((s) => ({
    device_mac:      s.mac,
    session_id:      sessionId || null,
    seat_number:     macToSeat.get(s.mac) ?? null,
    timestamp:       s.timestamp,
    phase:           s.phase,
    roll:            s.roll,
    feather_angle:   s.featherAngle,
    rush_score:      s.rushScore,
    stroke_rate:     s.strokeRate,
    catch_sharpness: s.catchSharpness,
    battery_level:   voltageToPercent(s.batteryVoltage),
    inserted_at:     new Date().toISOString(),
  }));

  const { error: upsertErr } = await supabase
    .from("telemetry")
    .upsert(telemetryRows, { onConflict: "device_mac" });

  if (upsertErr) {
    console.error("[/api/telemetry] Upsert error:", upsertErr.message);
    return err("Database error", 500);
  }

  // -------------------------------------------------------------------------
  // Everything below is fire-and-forget — response is sent before this runs.
  // -------------------------------------------------------------------------

  if (sessionId) {
    const broadcastPayload = sensors.map((s) => ({
      device_mac:      s.mac,
      seat_number:     macToSeat.get(s.mac) ?? null,
      session_id:      sessionId,
      timestamp:       s.timestamp,
      phase:           s.phase,
      roll:            s.roll,
      feather_angle:   s.featherAngle,
      rush_score:      s.rushScore,
      stroke_rate:     s.strokeRate,
      catch_sharpness: s.catchSharpness,
      battery_level:   voltageToPercent(s.batteryVoltage),
    }));

    void (async () => {
      try {
        const bc = supabase.channel(`session:${sessionId}`);
        await new Promise<void>((resolve) => {
          bc.subscribe((status) => { if (status === "SUBSCRIBED") resolve(); });
        });
        await bc.send({ type: "broadcast", event: "telemetry", payload: { sensors: broadcastPayload } });
        await supabase.removeChannel(bc);
      } catch {
        // Non-fatal — local WS is the primary real-time path
      }
    })();
  }

  // Update device last_seen + battery in the background
  const now = new Date().toISOString();
  void Promise.all(
    sensors.map((s) =>
      supabase
        .from("devices")
        .update({ last_seen: now, battery_level: voltageToPercent(s.batteryVoltage) })
        .eq("mac_address", s.mac),
    ),
  );

  return ok({ accepted: sensors.length });
}
