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

/** Full reading context for assistive technology, including values hidden on small screens. */
export function observationDescription(item: NonNullable<ReturnType<typeof patientSnapshot>>["observations"][number]): string {
  const format = (value: number) => value.toFixed(item.decimals === 0 && !Number.isInteger(value) ? 1 : item.decimals);
  const reference = item.reference === null
    ? "Not enough reference readings to compare."
    : `Initial reference: ${format(item.reference)} ${item.unit}.`;
  if (item.current === null) {
    const previous = item.lastValue === null
      ? "No earlier reading available."
      : `Last recorded: ${format(item.lastValue)} ${item.unit}, ${item.ageHours} ${item.ageHours === 1 ? "hour" : "hours"} earlier.`;
    return `No reading at this hour. ${previous} ${reference} No current comparison.`;
  }
  const unit = item.key === "spo2" ? "percentage points" : item.unit;
  const change = item.delta === null ? "" : item.delta === 0
    ? " Unchanged from the initial reference."
    : ` ${Math.abs(item.delta)} ${unit} ${item.delta > 0 ? "above" : "below"} the initial reference.`;
  return `${format(item.current)} ${item.unit} recorded this hour. ${reference}${change}`;
}

/** Historical context only; never fills a current reading or changes its delta. */
export function earlierObservationContext(item: NonNullable<ReturnType<typeof patientSnapshot>>["observations"][number], selectedHour: number): string | null {
  if (item.current !== null) return null;
  if (item.lastValue === null || item.ageHours === null) return "No earlier reading available.";
  const value = item.lastValue.toFixed(item.decimals === 0 && !Number.isInteger(item.lastValue) ? 1 : item.decimals);
  const delta = item.reference === null ? null : Number((item.lastValue - item.reference).toFixed(2));
  const reference = item.reference === null ? null : Number(item.reference.toFixed(2));
  const unit = item.key === "spo2" ? "percentage points" : item.unit;
  const comparison = delta === null ? "Not enough reference readings to compare."
    : delta === 0 ? "That reading was unchanged from the initial reference."
    : `That reading was ${Math.abs(delta)} ${unit} ${delta > 0 ? "above" : "below"} the initial reference (${reference} ${item.unit}).`;
  return `Last recorded ${value} ${item.unit} at hour ${selectedHour - item.ageHours}, ${item.ageHours} h earlier. ${comparison} This is an earlier reading, not a current measurement.`;
}

export function observationSummary(record: ReplayRecord, index: number): string {
  const snapshot = patientSnapshot(record.hours, index);
  if (!snapshot) return "No observations available.";
  const lines = snapshot.observations.map((item) => {
    const unit = item.key === "spo2" ? "percentage points" : item.unit;
    if (item.current === null) {
      return `${item.label}: no reading at this hour. ${earlierObservationContext(item, snapshot.hour)}`;
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
