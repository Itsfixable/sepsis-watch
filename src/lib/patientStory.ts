import type { ReplayHour, ReplayRecord } from "./types";
import { VITALS } from "./vitals";

const finite = (value: number | null) => typeof value === "number" && Number.isFinite(value);

/** A retrospective snapshot, calculated only from records revealed so far. */
export function patientSnapshot(hours: ReplayHour[], selectedIndex: number) {
  if (!hours.length) return null;
  const index = Math.max(0, Math.min(hours.length - 1, Math.trunc(selectedIndex) || 0));
  const visible = hours.slice(0, index + 1);
  const current = hours[index];
  const referenceEnd = hours[0].hour + 12;
  const observations = VITALS.map((vital) => {
    const samples = visible.filter((row) => row.hour < referenceEnd)
      .map((row) => row[vital.key]).filter((value): value is number => finite(value))
      .sort((a, b) => a - b);
    const middle = Math.floor(samples.length / 2);
    const reference = samples.length < 3 ? null : samples.length % 2
      ? samples[middle] : (samples[middle - 1] + samples[middle]) / 2;
    const last = visible.findLast((row) => finite(row[vital.key]));
    const value = finite(current[vital.key]) ? current[vital.key] : null;
    return {
      ...vital,
      current: value,
      lastValue: last?.[vital.key] ?? null,
      ageHours: last ? current.hour - last.hour : null,
      reference,
      referenceCount: samples.length,
      delta: value !== null && reference !== null ? Number((value - reference).toFixed(2)) : null,
    };
  });
  return {
    hour: current.hour,
    risk: current.risk,
    referenceComplete: current.hour >= referenceEnd,
    observations,
    freshCount: observations.filter((item) => item.current !== null).length,
  };
}

export function observationSummary(record: ReplayRecord, index: number): string {
  const snapshot = patientSnapshot(record.hours, index);
  if (!snapshot) return "No observations available.";
  const lines = snapshot.observations.map((item) => {
    const unit = item.key === "spo2" ? "percentage points" : item.unit;
    if (item.current === null) {
      return `${item.label}: no reading at this hour.${item.lastValue !== null ? ` Last recorded ${item.lastValue.toFixed(item.decimals)} ${item.unit}, ${item.ageHours} h earlier.` : " No earlier reading available."}`;
    }
    return `${item.label}: ${item.current.toFixed(item.decimals)} ${item.unit}.${item.delta !== null ? ` Change from initial reference: ${item.delta > 0 ? "+" : ""}${item.delta} ${unit}.` : " Not enough reference readings to compare."}`;
  });
  return [
    `SepsisWatch — ${record.label} — hour ${snapshot.hour}`,
    record.source === "synthetic" ? "Synthetic demo data; illustrative scores." : "Retrospective record review.",
    ...lines,
    `Reference: median of available readings in the first 12 hours; at least 3 per vital. ${snapshot.referenceComplete ? "Reference window complete." : "Reference is still building."}`,
    "Research prototype, not a diagnosis or validated medical device. This summary does not establish whether someone is well or unwell.",
  ].join("\n");
}
