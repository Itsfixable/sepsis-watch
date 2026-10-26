import type { ReplayHour, ReplayRecord } from "./types";
import { observationSummary, patientSnapshot } from "./patientStory";

export type ResearchRecord = {
  id: string;
  label: string;
  source: "physionet2019";
  sourceSha256: string;
  inferredOnsetHour: number | null;
  hours: ReplayHour[];
};

export type Evaluation = {
  patients: number; septicStays: number; nonSepticStays: number;
  eligibleHours: number; positiveHours: number; negativeHours: number; prevalence: number;
  scoredHours: number; unscoredHours: number; unscoredNegativeHours: number; unscoredPositiveHours: number;
  auroc: number | null; averagePrecision: number | null; brier: number | null;
  baselineBrier: number | null; baselineAveragePrecision: number | null; baselineAuroc: number | null;
  threshold: number | null; detectedStays: number | null; missedStays: number | null;
  falseAlarmStays: number | null; falsePositiveHours: number | null; falsePositiveHoursPer100: number | null;
  reliability: { from: number; to: number; count: number; meanScore: number | null; eventRate: number | null }[];
};
export type ResearchReport = {
  schemaVersion: 1; modelSha256: string; seed: number; datasetVersion: string;
  trainingPatients: number; trainingScoredHours: number; trainingPrevalence: number; threshold: number | null;
  exclusions: Record<"A" | "B", { rawPatients: number; rawHours: number; invalidValues: number; reasons: Record<string, number> }>;
  validation: Evaluation; internalTest: Evaluation; externalTest: Evaluation;
};

/** Same revealed-prefix reference logic as the demo, without synthetic source wording. */
export function researchSnapshot(record: ResearchRecord, selectedIndex: number) {
  if (!record.hours.length) return null;
  const index = Math.max(0, Math.min(record.hours.length - 1, Math.trunc(selectedIndex) || 0));
  const replay: ReplayRecord = { ...record, description: "Retrospective research record", age: null, sex: null, sepsisOnsetHour: null };
  return { current: record.hours[index], visible: record.hours.slice(0, index + 1),
    snapshot: patientSnapshot(record.hours, index)!, summary: observationSummary(replay, index) };
}
