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

  // Upsert telemetry rows (one per device — not append-only)
  const telemetryRows = sensors.map((s) => ({
    device_mac:      s.mac,
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

  // Update devices last_seen and battery_level
  for (const s of sensors) {
    await supabase
      .from("devices")
      .update({
        last_seen:     new Date().toISOString(),
        battery_level: voltageToPercent(s.batteryVoltage),
      })
      .eq("mac_address", s.mac);
  }

  return ok({ accepted: sensors.length });
}
