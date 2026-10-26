"use client";

import { usePlotArea } from "recharts";
import { RISK_THRESHOLDS } from "../lib/thresholds";

/** Sharp color boundary for score charts with a fixed 0–1 vertical axis. */
export function RiskStroke({ id }: { id: string }) {
  const plot = usePlotArea();
  if (!plot) return null;
  return <RiskStrokeDefinition id={id} top={plot.y} height={plot.height} />;
}

export function RiskStrokeDefinition({ id, top, height }: { id: string; top: number; height: number }) {
  const boundary = 1 - RISK_THRESHOLDS.red;
  return <defs>
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={top} y2={top + height}>
      <stop offset={boundary} stopColor="#b8322a" />
      <stop offset={boundary} stopColor="#226f5b" />
    </linearGradient>
  </defs>;
}
