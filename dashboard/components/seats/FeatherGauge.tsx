"use client";

import type { FeatherGaugeProps } from "@/types";

// =============================================================================
// FeatherGauge — SVG arc gauge 0–90°, needle, current angle label.
// =============================================================================

const R         = 36;   // arc radius
const CX        = 50;   // center x
const CY        = 52;   // center y (slightly off-center for better visual balance)
const START_DEG = 180;  // left of arc
const END_DEG   = 0;    // right of arc

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start     = polarToCartesian(cx, cy, r, endDeg);
  const end       = polarToCartesian(cx, cy, r, startDeg);
  const largeArc  = endDeg - startDeg <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export function FeatherGauge({ angleDeg, color }: FeatherGaugeProps) {
  // Map 0–90° to 180°–0° sweep on the arc
  const clampedAngle = Math.max(0, Math.min(90, angleDeg));
  const sweepDeg     = START_DEG - (clampedAngle / 90) * START_DEG;  // 180 → 0

  // Needle direction
  const needleRad = ((sweepDeg - 90) * Math.PI) / 180;
  const needleLen = R - 6;
  const nx        = CX + needleLen * Math.cos(needleRad);
  const ny        = CY + needleLen * Math.sin(needleRad);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="100" height="58" viewBox="0 0 100 58" aria-label={`Feather angle ${angleDeg}°`}>
        {/* Background arc */}
        <path
          d={describeArc(CX, CY, R, START_DEG, END_DEG)}
          fill="none"
          stroke="hsl(217 33% 17%)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Value arc */}
        {clampedAngle > 0 && (
          <path
            d={describeArc(CX, CY, R, START_DEG, sweepDeg)}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            opacity="0.85"
          />
        )}
        {/* Needle */}
        <line
          x1={CX}
          y1={CY}
          x2={nx}
          y2={ny}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r="3" fill={color} />
        {/* Label */}
        <text
          x={CX}
          y={CY - R - 4}
          textAnchor="middle"
          fill="hsl(210 40% 96%)"
          fontSize="10"
          fontWeight="600"
          fontFamily="ui-monospace, monospace"
        >
          {clampedAngle.toFixed(1)}°
        </text>
      </svg>
      <span className="text-xs text-muted-foreground">Feather</span>
    </div>
  );
}
