"use client";

import React from "react";

// =============================================================================
// ErrorBoundary — Catches unhandled render errors in subtrees.
// =============================================================================

interface Props {
  children:  React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  message:  string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message:  error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }

  override componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
            <div>
              <p className="text-sm font-semibold text-destructive">Something went wrong</p>
              <p className="mt-1 text-xs text-muted-foreground">{this.state.message}</p>
              <button
                onClick={() => this.setState({ hasError: false, message: "" })}
                className="mt-3 rounded border border-destructive/40 px-3 py-1 text-xs text-destructive hover:bg-destructive/10"
              >
                Try again
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
