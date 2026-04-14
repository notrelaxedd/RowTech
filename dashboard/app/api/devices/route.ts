import { createAdminClient } from "@/lib/supabaseAdmin";
import { ok, err } from "@/lib/apiResponse";
import type { DeviceWithAssignment } from "@/types";

// =============================================================================
// GET /api/devices — List all devices with current boat/seat assignment
// =============================================================================

export async function GET() {
  const supabase = createAdminClient();

  const { data: devices, error } = await supabase
    .from("devices")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return err("Failed to fetch devices", 500);

  // Join with boat_seats to get assignment info
  const macs = (devices ?? []).map((d) => d.mac_address);

  const { data: assignments } = await supabase
    .from("boat_seats")
    .select(`
      device_mac,
      seat_number,
      boats ( name ),
      profiles ( name )
    `)
    .in("device_mac", macs);

  const assignmentMap = new Map<
    string,
    { boat_name: string | null; seat_number: number | null; rower_name: string | null }
  >();

  for (const a of assignments ?? []) {
    if (!a.device_mac) continue;
    assignmentMap.set(a.device_mac, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      boat_name:   (a as any).boats?.name ?? null,
      seat_number: a.seat_number,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rower_name:  (a as any).profiles?.name ?? null,
    });
  }

  const result: DeviceWithAssignment[] = (devices ?? []).map((d) => {
    const assignment = assignmentMap.get(d.mac_address);
    return {
      ...d,
      boat_name:   assignment?.boat_name   ?? null,
      seat_number: assignment?.seat_number ?? null,
      rower_name:  assignment?.rower_name  ?? null,
    };
  });

  return ok(result);
}
