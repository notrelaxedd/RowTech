import Link from "next/link";

// =============================================================================
// 404 Page
// =============================================================================

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-2 text-xl font-bold text-foreground">Page not found</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
