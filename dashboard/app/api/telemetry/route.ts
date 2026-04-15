import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { validateHubSecret } from "@/lib/validateHubSecret";
import { telemetryPostSchema } from "@/lib/zodSchemas";
import { ok, err } from "@/lib/apiResponse";
import { voltageToPercent } from "@/lib/utils";

// =============================================================================
// POST /api/telemetry
// Hub posts live sensor data every 100ms.
// Upserts to telemetry table. Auto-registers unknown MACs in devices table.
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

  const parsed = telemetryPostSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.errors[0]?.message ?? "Invalid request body", 400);
  }

  const { sensors } = parsed.data;
  const supabase = createAdminClient();

  // Auto-register unknown MACs in devices table
  const macs = sensors.map((s) => s.mac);

  const { data: existingDevices } = await supabase
    .from("devices")
    .select("mac_address")
    .in("mac_address", macs);

  const existingMacs = new Set(
    (existingDevices ?? []).map((d) => d.mac_address),
  );

  const newDevices = macs
    .filter((mac) => !existingMacs.has(mac))
    .map((mac) => ({
      mac_address:      mac,
      name:             null,
      firmware_version: null,
    }));

  if (newDevices.length > 0) {
    const { error: insertErr } = await supabase
      .from("devices")
      .insert(newDevices);

    if (insertErr) {
      console.error("[/api/telemetry] Device auto-register error:", insertErr.message);
      // Non-fatal — continue with telemetry upsert
    }
  }

  // Look up the current active session + its boat seat layout
  const { data: activeSession } = await supabase
    .from("sessions")
    .select("id, boat_id")
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sessionId = activeSession?.id ?? null;

  // Build MAC → seat_number map from boat_seats if a session is active
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

  // Upsert telemetry rows (one per device — not append-only)
  const telemetryRows = sensors.map((s) => ({
    device_mac:      s.mac,
    session_id:      sessionId,
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

  // Broadcast processed seat state directly over Realtime so the dashboard
  // receives it immediately — bypassing the WAL latency of postgres_changes.
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

    // Fire-and-forget: don't block the response on broadcast delivery.
    void (async () => {
      const bc = supabase.channel(`session:${sessionId}`);
      await new Promise<void>((resolve) => {
        bc.subscribe((status) => { if (status === "SUBSCRIBED") resolve(); });
      });
      await bc.send({ type: "broadcast", event: "telemetry", payload: { sensors: broadcastPayload } });
      await supabase.removeChannel(bc);
    })();
  }

  // Update devices last_seen and battery_level (fire-and-forget)
  void Promise.all(
    sensors.map((s) =>
      supabase
        .from("devices")
        .update({
          last_seen:     new Date().toISOString(),
          battery_level: voltageToPercent(s.batteryVoltage),
        })
        .eq("mac_address", s.mac),
    ),
  );

  return ok({ accepted: sensors.length });
}
