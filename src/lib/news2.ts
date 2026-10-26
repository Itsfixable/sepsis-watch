// NEWS2 (National Early Warning Score 2, Royal College of Physicians, 2017) is
// the checklist score nurses use at the bedside. The full score also needs blood
// pressure, alertness and whether the patient is on oxygen. The bedside unit
// can't measure those, so this is the four-vital part only (SpO2 uses scale 1).
// It is the "no AI" baseline the model has to beat.

import type { ReplayHour, Vitals } from "./types";

/** A total of 5 or more is NEWS2's trigger for an urgent clinical review. */
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
 * NEWS2 for every hour, carrying each vital forward from its last reading the
 * way a nurse's chart does (temperature is often taken only every few hours).
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

/** One sentence comparing the model's first red hour with the NEWS2 alert. */
export function news2Comparison(redHour: number | null, news2Hour: number | null): string {
  const hrs = (n: number) => `${n} ${n === 1 ? "hour" : "hours"}`;
  if (redHour === null && news2Hour === null) return "The standard nurse checklist (NEWS2) never reached its alert level either.";
  if (news2Hour === null) return "The standard nurse checklist (NEWS2) never reached its alert level.";
  if (redHour === null) return `The standard nurse checklist (NEWS2) alerted at hour ${news2Hour}.`;
  if (news2Hour > redHour) return `The standard nurse checklist (NEWS2) alerted at hour ${news2Hour}, ${hrs(news2Hour - redHour)} later.`;
  if (news2Hour < redHour) return `The standard nurse checklist (NEWS2) alerted first, at hour ${news2Hour}.`;
  return "The standard nurse checklist (NEWS2) alerted at the same hour.";
}
