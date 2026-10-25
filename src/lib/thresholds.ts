// ────────────────────────────────────────────────────────────────
//  RISK THRESHOLDS: the one place to tune the status light.
//
//  The model outputs a risk score from 0 to 1 every hour.
//    risk <  YELLOW          → green  (low)
//    YELLOW <= risk < RED    → yellow (elevated)
//    risk >= RED             → red    (high)
//
//  After you train the model, pick new numbers here (for example from
//  your validation set's sensitivity / false-alarm trade-off). The status
//  light, the chart's threshold lines, and the replay summary all read
//  from this file, so nothing else needs to change.
// ────────────────────────────────────────────────────────────────

import type { RiskLevel } from "./types";

export const RISK_THRESHOLDS = {
  yellow: 0.3,
  red: 0.6,
} as const;

/** Turn a risk score into a status-light colour. */
export function riskLevel(risk: number | null | undefined): RiskLevel {
  if (risk === null || risk === undefined || Number.isNaN(risk)) return "none";
  if (risk >= RISK_THRESHOLDS.red) return "red";
  if (risk >= RISK_THRESHOLDS.yellow) return "yellow";
  return "green";
}

/** Words shown next to the light. Worded as an early warning, never a diagnosis. */
export const LEVEL_TEXT: Record<RiskLevel, { title: string; message: string }> = {
  none: {
    title: "No score",
    message: "Waiting for the first risk score from the bedside unit.",
  },
  green: {
    title: "Low",
    message: "Low early-warning risk. Continue routine monitoring.",
  },
  yellow: {
    title: "Elevated",
    message: "Early-warning risk is rising. Watch this patient more closely.",
  },
  red: {
    title: "High",
    message: "High early-warning risk. Alert the care team to evaluate the patient.",
  },
};
