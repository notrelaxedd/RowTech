import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { updateProfileSchema } from "@/lib/zodSchemas";
import { ok, err } from "@/lib/apiResponse";

// =============================================================================
// PUT /api/profiles/[id] — Update rower profile
// =============================================================================

interface RouteParams {
  params: { id: string };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON", 400);
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.errors[0]?.message ?? "Invalid request body", 400);
  }

  if (Object.keys(parsed.data).length === 0) {
    return err("No fields to update", 400);
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return err("Failed to update profile", 500);
  if (!data)  return err("Profile not found", 404);

  return ok(data);
}
