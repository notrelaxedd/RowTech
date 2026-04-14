"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

// =============================================================================
// Login Page — Magic Link Authentication
// No passwords. Users receive a one-click sign-in link via email.
// =============================================================================

export default function LoginPage() {
  const [email, setEmail]     = useState("");
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              aria-hidden="true"
            >
              <rect width="32" height="32" rx="8" fill="#0ea5e9" />
              <path
                d="M6 22 Q12 10 16 16 Q20 22 26 10"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <span className="text-2xl font-bold tracking-tight text-foreground">
              RowTech
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Oar Sensor Dashboard
          </p>
        </div>

        {sent ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <div className="mb-3 text-4xl">📧</div>
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              Check your email
            </h2>
            <p className="text-sm text-muted-foreground">
              We sent a magic link to{" "}
              <span className="font-medium text-foreground">{email}</span>.
              Click it to sign in.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-4 text-sm text-primary underline-offset-4 hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-6">
            <h1 className="mb-1 text-xl font-semibold text-foreground">
              Sign in
            </h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Enter your email to receive a magic link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="coach@crew.org"
                  className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send magic link"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
