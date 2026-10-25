// "What changed from normal?" Compares the latest known reading with this
// patient's own normal (the median of their first hours on record) so a
// warning is never a black box. It explains the vitals; it is not how the
// model scores them.

import type { ReplayHour, VitalKey } from "./types";
import { lastKnown } from "./vitals";

const BASELINE_HOURS = 12;

export type Change = {
  key: VitalKey;
  label: string;
  unit: string;
  decimals: number;
  baseline: number;
  current: number;
  /** True when the change is in the direction that matters for sepsis. */
  concerning: boolean;
};

// How big a move counts, and which way is worrying, for each vital.
const RULES: Record<VitalKey, { label: string; unit: string; decimals: number; step: number; worse: 1 | -1 }> = {
  heartRate: { label: "Heart rate", unit: "bpm", decimals: 0, step: 15, worse: 1 },
  respRate: { label: "Breathing rate", unit: "/min", decimals: 0, step: 4, worse: 1 },
  tempC: { label: "Temperature", unit: "°C", decimals: 1, step: 0.8, worse: 1 },
  spo2: { label: "Oxygen", unit: "%", decimals: 0, step: 3, worse: -1 },
};

function median(nums: number[]) {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export const baselineReady = (index: number) => index >= BASELINE_HOURS;

/** Vitals that have moved clearly away from the patient's normal, biggest move first. */
export function changesFromBaseline(hours: ReplayHour[], index: number): Change[] {
  if (!baselineReady(index)) return [];
  const early = hours.slice(0, BASELINE_HOURS);
  const changes: { change: Change; size: number }[] = [];
  for (const key of Object.keys(RULES) as VitalKey[]) {
    const rule = RULES[key];
    const nums = early.map((h) => h[key]).filter((v): v is number => v !== null);
    const found = lastKnown(hours, key, index);
    if (nums.length < 3 || !found) continue;
    const baseline = median(nums);
    const size = (found.value - baseline) / rule.step;
    if (Math.abs(size) < 1) continue;
    const { label, unit, decimals } = rule;
    const change = { key, label, unit, decimals, baseline, current: found.value, concerning: Math.sign(size) === rule.worse };
    changes.push({ change, size });
  }
  return changes.sort((a, b) => Math.abs(b.size) - Math.abs(a.size)).map((c) => c.change);
}
