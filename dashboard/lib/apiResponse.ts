import { NextResponse } from "next/server";
import type { ApiSuccess, ApiError } from "@/types";

// =============================================================================
// Typed API Response Helpers
// All routes use these to ensure consistent { ok, data } / { ok, error } shape.
// =============================================================================

export function ok<T>(data: T, status: number = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ ok: true, data }, { status });
}

export function err(message: string, status: number = 400): NextResponse<ApiError> {
  return NextResponse.json({ ok: false, error: message }, { status });
}
