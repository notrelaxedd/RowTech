import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { createProfileSchema } from "@/lib/zodSchemas";
import { ok, err } from "@/lib/apiResponse";

// =============================================================================
// GET  /api/profiles — List all rower profiles
// POST /api/profiles — Create a new profile
// =============================================================================

export async function GET() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("name");

  if (error) return err("Failed to fetch profiles", 500);

  return ok(data ?? []);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON", 400);
  }

  const parsed = createProfileSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.errors[0]?.message ?? "Invalid request body", 400);
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profiles")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return err("Failed to create profile", 500);

  return ok(data, 201);
}
