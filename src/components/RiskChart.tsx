"use client";

// Line chart of the hourly risk score, drawn with the Recharts library.
// - The shaded bands and dashed lines are the yellow and red thresholds
//   from src/lib/thresholds.ts.
// - `markers` draws labelled vertical lines (used by the Replay page for
//   "turned red" and "sepsis recognized").

import { useId } from "react";
import { RiskStroke } from "./RiskStroke";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  Tooltip,
  usePlotArea,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { LEVEL_TEXT, RISK_THRESHOLDS, riskLevel } from "@/lib/thresholds";
import { formatRisk } from "@/lib/vitals";

export type ChartPoint = { x: number; risk: number | null };

export type ChartMarker = {
  x: number;
  label: string;
  tone: "critical" | "neutral" | "warning";
};

type Props = {
  points: ChartPoint[];
  xDomain: [number, number];
  xTicks: number[];
  /** Short axis label for an x value, e.g. "14:00" or "h12". */
  formatTick: (x: number) => string;
  /** Longer label for the tooltip, e.g. "Oct 1, 14:00" or "Hour 12". */
  formatX: (x: number) => string;
  markers?: ChartMarker[];
  /** Draw a dot on the newest point (the replay "playhead"). */
  showEndDot?: boolean;
  ariaLabel: string;
  illustrative?: boolean;
};

// Threshold labels get a dark outline so they stay readable where a marker line crosses them.
const THRESHOLD_LABEL = {
  fill: "var(--color-ink-2)",
  fontSize: 11,
  stroke: "var(--color-panel)",
  strokeWidth: 4,
  paintOrder: "stroke",
} as const;

const AXIS = { stroke: "var(--color-hairline)", fontSize: 11, fill: "var(--color-muted)" };

export function RiskChart({ points, xDomain, xTicks, formatTick, formatX, markers = [], showEndDot, ariaLabel, illustrative = false }: Props) {
  const riskStrokeId = useId();
  const last = [...points].reverse().find((p) => p.risk !== null);

  return (
    <div className="risk-chart" role="img" aria-label={ariaLabel}>
      <LineChart responsive data={points} margin={{ top: 22, right: 12, bottom: 4, left: -8 }} style={{ width: "100%", height: "100%" }}>
        <RiskStroke id={riskStrokeId} />
        <CartesianGrid vertical={false} stroke="var(--color-grid)" strokeDasharray="3 4" />

        {/* Threshold bands: faint tint above each line. */}
        <ReferenceArea y1={RISK_THRESHOLDS.yellow} y2={RISK_THRESHOLDS.red} fill="var(--color-warning)" fillOpacity={0.025} ifOverflow="hidden" />
        <ReferenceArea y1={RISK_THRESHOLDS.red} y2={1} fill="var(--color-critical)" fillOpacity={0.035} ifOverflow="hidden" />
        <ReferenceLine
          y={RISK_THRESHOLDS.yellow}
          stroke="var(--color-warning)"
          strokeDasharray="5 4"
          strokeOpacity={0.5}
          label={{ value: `Elevated · ${RISK_THRESHOLDS.yellow.toFixed(2)}`, position: "insideTopLeft", ...THRESHOLD_LABEL }}
        />
        <ReferenceLine
          y={RISK_THRESHOLDS.red}
          stroke="var(--color-critical)"
          strokeDasharray="5 4"
          strokeOpacity={0.5}
          label={{ value: `High · ${RISK_THRESHOLDS.red.toFixed(2)}`, position: "insideTopLeft", ...THRESHOLD_LABEL }}
        />

        {markers.map((m, row) => (
          <ReferenceLine
            key={`${m.tone}-${m.x}`}
            x={m.x}
            stroke={
              m.tone === "critical" ? "var(--color-critical)" : m.tone === "warning" ? "var(--color-warning)" : "var(--color-ink)"
            }
            strokeWidth={1.5}
            strokeDasharray={m.tone === "neutral" ? "2 3" : m.tone === "warning" ? "5 3" : undefined}
            label={(props: { viewBox?: { x?: number; y?: number } }) => (
              <MarkerLabel x={props.viewBox?.x ?? 0} y={props.viewBox?.y ?? 0} row={row} text={m.label} />
            )}
          />
        ))}

        <XAxis
          dataKey="x"
          type="number"
          domain={xDomain}
          ticks={xTicks}
          tickFormatter={formatTick}
          tick={{ fill: AXIS.fill, fontSize: AXIS.fontSize }}
          stroke={AXIS.stroke}
          tickLine={false}
        />
        <YAxis
          domain={[0, 1]}
          ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
          tickFormatter={(v: number) => v.toFixed(1)}
          tick={{ fill: AXIS.fill, fontSize: AXIS.fontSize }}
          stroke={AXIS.stroke}
          tickLine={false}
          axisLine={false}
          width={40}
        />

        <Tooltip
          cursor={{ stroke: "var(--color-ink-2)", strokeWidth: 1 }}
          isAnimationActive={false}
          content={(props) => <ChartTooltip {...props} formatX={formatX} illustrative={illustrative} />}
        />

        <Line
          type="linear"
          dataKey="risk"
          stroke={`url(#${riskStrokeId})`}
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          dot={false}
          activeDot={{ r: 5, fill: `url(#${riskStrokeId})`, stroke: "var(--color-panel)", strokeWidth: 2 }}
          connectNulls={false}
          isAnimationActive={false}
        />

        {showEndDot && last && last.risk !== null && (
          <ReferenceDot x={last.x} y={last.risk} r={5} fill={last.risk >= RISK_THRESHOLDS.red ? "#b8322a" : "var(--color-trace)"} stroke="var(--color-panel)" strokeWidth={2} />
        )}
      </LineChart>
    </div>
  );
}

/**
 * Label at the top of a marker line. It sits to the right of the line when it
 * fits, otherwise to the left; each marker gets its own row so labels never overlap.
 */
function MarkerLabel({ x, y, row, text }: { x: number; y: number; row: number; text: string }) {
  const plot = usePlotArea();
  const estimatedWidth = text.length * 6.4;
  const fitsRight = !plot || x + 6 + estimatedWidth <= plot.x + plot.width;
  return (
    <text
      x={fitsRight ? x + 6 : x - 6}
      y={y + 14 + row * 17}
      textAnchor={fitsRight ? "start" : "end"}
      fill="var(--color-ink)"
      stroke="var(--color-panel)"
      strokeWidth={4}
      paintOrder="stroke"
      fontSize={11}
      fontWeight={600}
    >
      {text}
    </text>
  );
}

function ChartTooltip({ active, payload, formatX, illustrative }: TooltipContentProps & { formatX: (x: number) => string; illustrative: boolean }) {
  const point = payload?.[0]?.payload as ChartPoint | undefined;
  if (!active || !point) return null;
  const level = riskLevel(point.risk);
  return (
    <div className="chart-tooltip">
      <p className="text-ink-2">{formatX(point.x)}</p>
      <p className="mt-1 flex items-center gap-2">
        <span aria-hidden className="inline-block h-0.5 w-3 rounded bg-trace" />
        <span className="text-sm font-semibold text-ink">{formatRisk(point.risk)}</span>
        <span className="text-ink-2">{illustrative ? "illustrative score" : "risk"} · {LEVEL_TEXT[level].title}</span>
      </p>
    </div>
  );
}

/** Evenly spaced, round-number tick positions (in hours, or ms when `unit` is 1 hour in ms). */
export function hourTicks(min: number, max: number, unit = 1, maxTicks = 7): number[] {
  const spanHours = Math.max(1, (max - min) / unit);
  const step = [1, 2, 3, 4, 6, 12, 24, 48, 72, 168].find((s) => spanHours / s <= maxTicks - 1) ?? 336;
  const ticks: number[] = [];
  for (let t = Math.ceil(min / (step * unit)) * step * unit; t <= max; t += step * unit) ticks.push(t);
  return ticks;
}
