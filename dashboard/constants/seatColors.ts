// =============================================================================
// Seat Colors — Single Source of Truth
// ALL seat colors and labels in the application come from here.
// Never hardcode seat colors in components.
// =============================================================================

export const SEAT_COLORS: Record<number, string> = {
  8: "#E24B4A", // Stroke — Red
  7: "#EF9F27", // 7-seat — Orange
  6: "#F5C842", // 6-seat — Yellow
  5: "#639922", // 5-seat — Green
  4: "#378ADD", // 4-seat — Blue
  3: "#7F77DD", // 3-seat — Purple
  2: "#D4537E", // 2-seat — Pink
  1: "#D3D1C7", // Bow    — Light Gray
};

export const SEAT_LABELS: Record<number, string> = {
  8: "Stroke",
  7: "7-Seat",
  6: "6-Seat",
  5: "5-Seat",
  4: "4-Seat",
  3: "3-Seat",
  2: "2-Seat",
  1: "Bow",
};

// Ordered from stern (stroke seat 8) to bow (seat 1)
export const SEAT_ORDER = [8, 7, 6, 5, 4, 3, 2, 1] as const;
