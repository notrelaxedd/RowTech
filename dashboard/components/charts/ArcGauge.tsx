import type { ArcGaugeProps } from "@/types";

// =============================================================================
// ArcGauge — Reusable SVG arc gauge. Used by FeatherGauge and elsewhere.
// =============================================================================

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start    = polarToCartesian(cx, cy, r, endDeg);
  const end      = polarToCartesian(cx, cy, r, startDeg);
  const largeArc = endDeg - startDeg <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export function ArcGauge({ value, min, max, color, label }: ArcGaugeProps) {
  const CX = 50;
  const CY = 55;
  const R  = 38;

  const pct      = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const startDeg = 180;
  const endDeg   = startDeg - pct * 180;

  const needleRad = ((endDeg - 90) * Math.PI) / 180;
  const nx        = CX + (R - 6) * Math.cos(needleRad);
  const ny        = CY + (R - 6) * Math.sin(needleRad);

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="62" viewBox="0 0 100 62" aria-label={`${label}: ${value}`}>
        <path
          d={describeArc(CX, CY, R, startDeg, 0)}
          fill="none"
          stroke="hsl(217 33% 17%)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {pct > 0 && (
          <path
            d={describeArc(CX, CY, R, startDeg, endDeg)}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            opacity="0.85"
          />
        )}
        <line
          x1={CX} y1={CY} x2={nx} y2={ny}
          stroke={color} strokeWidth="2" strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r="3" fill={color} />
        <text
          x={CX} y={CY - R - 4}
          textAnchor="middle"
          fill="hsl(210 40% 96%)"
          fontSize="10"
          fontWeight="600"
          fontFamily="ui-monospace, monospace"
        >
          {value.toFixed(1)}
        </text>
      </svg>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
