import "server-only";
import type { NextRequest } from "next/server";

// =============================================================================
// Hub Secret Validation
// All hub-to-server API routes must call this before processing the request.
// Returns true if the x-hub-secret header matches the HUB_SECRET env var.
// =============================================================================

export function validateHubSecret(request: NextRequest): boolean {
  const provided = request.headers.get("x-hub-secret");
  const expected = process.env.HUB_SECRET;

  if (!expected) {
    console.error("[HUB_SECRET] HUB_SECRET env var not set — rejecting all hub requests");
    return false;
  }

  return provided === expected;
}
