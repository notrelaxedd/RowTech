import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { updateDeviceSchema } from "@/lib/zodSchemas";
import { ok, err } from "@/lib/apiResponse";

// =============================================================================
// PUT /api/devices/[mac] — Update device display name
// =============================================================================

interface RouteParams {
  params: { mac: string };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const mac = decodeURIComponent(params.mac);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON", 400);
  }

  const parsed = updateDeviceSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.errors[0]?.message ?? "Invalid request body", 400);
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("devices")
    .update({ name: parsed.data.name })
    .eq("mac_address", mac)
    .select()
    .single();

  if (error) return err("Failed to update device", 500);
  if (!data)  return err("Device not found", 404);

  return ok(data);
}
