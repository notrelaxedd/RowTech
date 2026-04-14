"use client";

import { useState } from "react";
import { SEAT_COLORS, SEAT_LABELS } from "@/constants/seatColors";
import { round } from "@/lib/utils";
import type { Stroke } from "@/types";

// =============================================================================
// StrokeSummaryTable — Sortable table of all strokes with seat color accents.
// =============================================================================

type SortKey = "timestamp" | "stroke_rate" | "feather_angle" | "rush_score" | "catch_sharpness";

interface StrokeSummaryTableProps {
  strokes: Stroke[];
}

export function StrokeSummaryTable({ strokes }: StrokeSummaryTableProps) {
  const [sortKey,  setSortKey]  = useState<SortKey>("timestamp");
  const [sortAsc,  setSortAsc]  = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((a) => !a);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sorted = [...strokes].sort((a, b) => {
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const SortHeader = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      onClick={() => handleSort(k)}
      className="cursor-pointer select-none px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
    >
      {label} {sortKey === k ? (sortAsc ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead className="bg-secondary">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Seat
            </th>
            <SortHeader k="timestamp"       label="Time"    />
            <SortHeader k="stroke_rate"     label="Rate"    />
            <SortHeader k="feather_angle"   label="Feather" />
            <SortHeader k="rush_score"      label="Rush"    />
            <SortHeader k="catch_sharpness" label="Catch"   />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.slice(0, 200).map((stroke) => {
            const seatNum = stroke.seat_number ?? 0;
            const color   = SEAT_COLORS[seatNum] ?? "#666";
            const label   = SEAT_LABELS[seatNum] ?? `Seat ${seatNum}`;
            return (
              <tr
                key={stroke.id}
                className="hover:bg-secondary/50 transition-colors"
                style={{ borderLeft: `3px solid ${color}` }}
              >
                <td className="px-3 py-1.5 font-medium" style={{ color }}>
                  {label}
                </td>
                <td className="px-3 py-1.5 font-mono tabular-nums text-muted-foreground">
                  {stroke.timestamp}
                </td>
                <td className="px-3 py-1.5 font-mono tabular-nums">
                  {stroke.stroke_rate != null ? `${stroke.stroke_rate.toFixed(1)} spm` : "—"}
                </td>
                <td className="px-3 py-1.5 font-mono tabular-nums">
                  {stroke.feather_angle != null ? `${round(stroke.feather_angle, 1)}°` : "—"}
                </td>
                <td className="px-3 py-1.5 font-mono tabular-nums">
                  {stroke.rush_score != null ? round(stroke.rush_score, 2) : "—"}
                </td>
                <td className="px-3 py-1.5 font-mono tabular-nums">
                  {stroke.catch_sharpness != null ? `${stroke.catch_sharpness}ms` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {strokes.length > 200 && (
        <div className="border-t border-border bg-secondary px-3 py-2 text-xs text-muted-foreground">
          Showing first 200 of {strokes.length} strokes
        </div>
      )}
    </div>
  );
}
