"use client";

import { use } from "react";
import { useSessionDetail }      from "@/hooks/useSessionDetail";
import { SessionHeader }         from "@/components/sessions/SessionHeader";
import { StrokeChart }           from "@/components/sessions/StrokeChart";
import { StrokeSummaryTable }    from "@/components/sessions/StrokeSummaryTable";

// =============================================================================
// Session Detail Page (/sessions/[id])
// =============================================================================

interface Props {
  params: Promise<{ id: string }>;
}

export default function SessionDetailPage({ params }: Props) {
  const { id }                    = use(params);
  const { session, isLoading, error } = useSessionDetail(id);

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading session…</div>;
  if (error)     return <div className="text-sm text-destructive">{error}</div>;
  if (!session)  return <div className="text-sm text-muted-foreground">Session not found.</div>;

  const allStrokes = Object.values(session.strokes_by_seat).flat();

  return (
    <div className="space-y-6">
      <SessionHeader session={session} />
      <StrokeChart strokesBySeat={session.strokes_by_seat} />
      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          All Strokes ({allStrokes.length})
        </h2>
        <StrokeSummaryTable strokes={allStrokes} />
      </div>
    </div>
  );
}
