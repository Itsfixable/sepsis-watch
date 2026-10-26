// Four-vital comparison based on NEWS2 (Royal College of Physicians, 2017).
// This partial score omits blood pressure, consciousness/new confusion and
// supplemental oxygen use. SpO2 uses scale 1. It is not full clinical NEWS2.

import type { ReplayHour, Vitals } from "./types";

/** Demo comparison threshold; not a validated clinical trigger for this partial score. */
export const NEWS2_ALERT_AT = 5;

function respScore(rr: number) {
  if (rr <= 8) return 3;
  if (rr <= 11) return 1;
  if (rr <= 20) return 0;
  if (rr <= 24) return 2;
  return 3;
}

function spo2Score(s: number) {
  if (s <= 91) return 3;
  if (s <= 93) return 2;
  if (s <= 95) return 1;
  return 0;
}

function tempScore(t: number) {
  if (t <= 35.0) return 3;
  if (t <= 36.0) return 1;
  if (t <= 38.0) return 0;
  if (t <= 39.0) return 1;
  return 2;
}

function hrScore(hr: number) {
  if (hr <= 40) return 3;
  if (hr <= 50) return 1;
  if (hr <= 90) return 0;
  if (hr <= 110) return 1;
  if (hr <= 130) return 2;
  return 3;
}

/** Four-vital NEWS2 total, or null if any of the four is missing. */
export function news2(v: Vitals): number | null {
  if (v.respRate === null || v.spo2 === null || v.tempC === null || v.heartRate === null) return null;
  return respScore(v.respRate) + spo2Score(v.spo2) + tempScore(v.tempC) + hrScore(v.heartRate);
}

/**
 * Partial comparison per hour, carrying each vital forward from its last
 * available reading. This demo convention may use stale measurements.
 */
export function news2Series(hours: ReplayHour[]): (number | null)[] {
  const last: Vitals = { heartRate: null, respRate: null, tempC: null, spo2: null };
  return hours.map((h) => {
    for (const key of Object.keys(last) as (keyof Vitals)[]) if (h[key] !== null) last[key] = h[key];
    return news2(last);
  });
}

/** First hour the four-vital NEWS2 reached its alert level, or null. */
export function firstNews2AlertHour(hours: ReplayHour[]): number | null {
  const scores = news2Series(hours);
  const i = scores.findIndex((s) => s !== null && s >= NEWS2_ALERT_AT);
  return i >= 0 ? hours[i].hour : null;
}

/** Compare supplied-score and partial NEWS2 threshold crossings, not accuracy. */
export function news2Comparison(redHour: number | null, news2Hour: number | null): string {
  const hrs = (n: number) => `${n} ${n === 1 ? "hour" : "hours"}`;
  const label = "The four-vital NEWS2 comparison (partial score)";
  if (redHour === null && news2Hour === null) return `${label} did not reach its demo threshold either.`;
  if (news2Hour === null) return `${label} did not reach its demo threshold.`;
  if (redHour === null) return `${label} reached its demo threshold at hour ${news2Hour}.`;
  if (news2Hour > redHour) return `${label} reached its demo threshold at hour ${news2Hour}, ${hrs(news2Hour - redHour)} later.`;
  if (news2Hour < redHour) return `${label} reached its demo threshold first, at hour ${news2Hour}.`;
  return `${label} reached its demo threshold at the same hour.`;
}
