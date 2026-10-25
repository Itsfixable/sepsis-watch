// Works out when the light first turned red in a replay and writes the
// one-sentence result shown at the end of playback. It reports misses and
// false alarms just as plainly as early warnings.

import { RISK_THRESHOLDS } from "./thresholds";
import type { ReplayHour, ReplayRecord } from "./types";

/** The first hour whose risk reached the red threshold, or null if it never did. */
export function firstRedHour(hours: ReplayHour[]): number | null {
  const hit = hours.find((h) => h.risk !== null && h.risk >= RISK_THRESHOLDS.red);
  return hit ? hit.hour : null;
}

export type ReplayOutcome = "early" | "same-hour" | "late" | "missed" | "quiet" | "false-alarm";

const hoursText = (n: number) => `${n} ${n === 1 ? "hour" : "hours"}`;

export function replaySummary(record: ReplayRecord): { outcome: ReplayOutcome; text: string } {
  const red = firstRedHour(record.hours);
  const onset = record.sepsisOnsetHour;
  const onsetLabel = record.source === "synthetic" ? "simulated sepsis onset" : "recorded sepsis onset";

  if (onset !== null && red !== null) {
    const lead = onset - red;
    if (lead > 0) {
      return {
        outcome: "early",
        text: `Warning turned red at hour ${red}, ${hoursText(lead)} before ${onsetLabel}.`,
      };
    }
    if (lead === 0) {
      return {
        outcome: "same-hour",
        text: `Warning turned red at hour ${red}, the same hour as ${onsetLabel}.`,
      };
    }
    return {
      outcome: "late",
      text: `Warning turned red at hour ${red}, ${hoursText(-lead)} after ${onsetLabel}.`,
    };
  }

  if (onset !== null) {
    return {
      outcome: "missed",
      text: `The warning never turned red. The ${onsetLabel} was at hour ${onset}.`,
    };
  }

  if (red !== null) {
    return {
      outcome: "false-alarm",
      text: `Warning turned red at hour ${red}, with no sepsis onset in this ${record.source === "synthetic" ? "scenario" : "record"} (a false alarm).`,
    };
  }

  return {
    outcome: "quiet",
    text: `The warning stayed below red across ${record.hours.length} hourly observations. No sepsis onset is included in this ${record.source === "synthetic" ? "scenario" : "record"}.`,
  };
}
