"use client";

import { useEffect } from "react";

// =============================================================================
// Root error page — catches unhandled errors at the app level.
// =============================================================================

interface ErrorProps {
  error:  Error & { digest?: string };
  reset:  () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="max-w-md text-center">
        <h1 className="mb-2 text-xl font-bold text-foreground">Something went wrong</h1>
        <p className="mb-4 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
