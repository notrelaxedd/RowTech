import "server-only";
import { createClient } from "@supabase/supabase-js";

// =============================================================================
// Supabase Service Role Client (server-only — NEVER import in client components)
// Use this client in API routes for privileged operations.
// The "server-only" import will cause a build error if this file is imported
// from a client component, preventing accidental key leakage.
// =============================================================================

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession:   false,
      },
    },
  );
}
