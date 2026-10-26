import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { Evaluation, ResearchRecord, ResearchReport } from "./research";

type ObjectValue = Record<string, unknown>;
const fail = (field: string): never => { throw new Error(`Invalid research artifact: ${field}`); };
function object(value: unknown, field: string): ObjectValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail(field);
  return value as ObjectValue;
}
function number(value: unknown, field: string, min = 0, max = Infinity): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) return fail(field);
  return value;
}
function count(value: unknown, field: string): number {
  const n = number(value, field);
  if (!Number.isInteger(n)) return fail(field);
  return n;
}
function nullable(value: unknown, field: string, max = 1) {
  return value === null ? null : number(value, field, 0, max);
}
function evaluation(value: unknown, threshold: number | null): Evaluation {
  const e = object(value, "evaluation");
  for (const key of ["patients", "septicStays", "nonSepticStays", "eligibleHours", "positiveHours", "negativeHours", "scoredHours", "unscoredHours", "unscoredNegativeHours", "unscoredPositiveHours"]) count(e[key], key);
  for (const key of ["prevalence", "auroc", "averagePrecision", "brier", "baselineBrier", "baselineAveragePrecision", "baselineAuroc", "threshold"]) nullable(e[key], key);
  for (const key of ["detectedStays", "missedStays", "falseAlarmStays", "falsePositiveHours"]) {
    if (threshold === null) { if (e[key] !== null) fail(key); }
    else count(e[key], key);
  }
  nullable(e.falsePositiveHoursPer100, "falsePositiveHoursPer100", 100);
  const result = e as unknown as Evaluation;
  if (result.threshold !== threshold || result.patients !== result.septicStays + result.nonSepticStays ||
      result.eligibleHours !== result.positiveHours + result.negativeHours ||
      result.eligibleHours !== result.scoredHours + result.unscoredHours ||
      result.unscoredHours !== result.unscoredPositiveHours + result.unscoredNegativeHours ||
      result.unscoredPositiveHours > result.positiveHours || result.unscoredNegativeHours > result.negativeHours ||
      (threshold !== null && (result.detectedStays! + result.missedStays! !== result.septicStays || result.falseAlarmStays! > result.nonSepticStays || result.falsePositiveHours! > result.negativeHours))) fail("evaluation counts");
  if (!Array.isArray(e.reliability) || e.reliability.length !== 10) fail("reliability");
  const bins = e.reliability as unknown[];
  let total = 0;
  bins.forEach((item, i) => {
    const bin = object(item, "reliability bin");
    if (bin.from !== i / 10 || bin.to !== (i + 1) / 10) fail("reliability bounds");
    total += count(bin.count, "reliability count");
    nullable(bin.meanScore, "meanScore"); nullable(bin.eventRate, "eventRate");
    if (bin.count === 0 ? bin.meanScore !== null || bin.eventRate !== null : bin.meanScore === null || bin.eventRate === null) fail("reliability missing values");
  });
  if (total !== result.scoredHours) fail("reliability total");
  return result;
}

/** Static artifacts fail closed during the build, including a byte-exact model hash check. */
export function parseResearchBundle(modelText: string, reportText: string, examplesText: string) {
  const model = object(JSON.parse(modelText), "model");
  const report = object(JSON.parse(reportText), "report");
  const examples = object(JSON.parse(examplesText), "examples");
  if ([model, report, examples].some(value => value.schemaVersion !== 1)) fail("schemaVersion");
  const modelSha256 = createHash("sha256").update(modelText).digest("hex");
  if (report.modelSha256 !== modelSha256 || examples.modelSha256 !== modelSha256) fail("model hash mismatch");
  const names = ["HR", "Resp", "Temp", "O2Sat"].flatMap(v => ["value", "age", "current"].map(p => `${v}_${p}`));
  if (JSON.stringify(model.featureNames) !== JSON.stringify(names) || model.algorithm !== "Logistic regression (L2, C=1)") fail("model definition");
  for (const key of ["imputation", "mean", "scale", "coefficients"]) {
    const values = model[key];
    if (!Array.isArray(values) || values.length !== 12) fail(key);
    (values as unknown[]).forEach(v => number(v, key, key === "scale" ? Number.MIN_VALUE : -Infinity));
  }
  number(model.intercept, "intercept", -Infinity);
  for (const key of ["trainingPatients", "trainingScoredHours", "seed"]) count(report[key], key);
  number(report.trainingPrevalence, "trainingPrevalence", 0, 1);
  const threshold = nullable(report.threshold, "threshold");
  if (report.seed !== 2026 || report.datasetVersion !== "1.0.0") fail("experiment version");
  for (const key of ["validation", "internalTest", "externalTest"]) evaluation(report[key], threshold);
  const exclusions = object(report.exclusions, "exclusions");
  for (const cohort of ["A", "B"]) {
    const stats = object(exclusions[cohort], "cohort exclusions");
    for (const key of ["rawPatients", "rawHours", "invalidValues"]) count(stats[key], key);
    Object.values(object(stats.reasons, "exclusion reasons")).forEach(v => count(v, "excluded patients"));
  }
  if (!Array.isArray(examples.records) || examples.records.length !== 2) fail("records");
  const ids = new Set();
  const records = (examples.records as unknown[]).map((value): ResearchRecord => {
    const record = object(value, "record");
    if (typeof record.id !== "string" || !/^A:p\d+$/.test(record.id) || ids.has(record.id)) fail("record id");
    ids.add(record.id);
    if (record.source !== "physionet2019" || typeof record.label !== "string" || !/^Research record [12]$/.test(record.label)) fail("record source or label");
    if (typeof record.sourceSha256 !== "string" || !/^[a-f0-9]{64}$/.test(record.sourceSha256)) fail("source hash");
    if (!Array.isArray(record.hours) || !record.hours.length) fail("hours");
    (record.hours as unknown[]).forEach((value, index) => {
      const row = object(value, "hour");
      if (row.hour !== index) fail("hour sequence");
      for (const [key, low, high] of [["heartRate", 20, 250], ["respRate", 2, 80], ["tempC", 25, 45], ["spo2", 50, 100]] as const) {
        if (row[key] !== null) number(row[key], key, low, high);
      }
      nullable(row.risk, "risk");
    });
    if (record.inferredOnsetHour !== null && count(record.inferredOnsetHour, "onset") !== (record.hours as unknown[]).length) fail("inferred onset boundary");
    return record as unknown as ResearchRecord;
  });
  if (records[0].inferredOnsetHour === null || records[1].inferredOnsetHour !== null) fail("example outcome groups");
  return { modelName: model.algorithm as string, modelSha256, imputation: [...model.imputation as number[]], report: report as unknown as ResearchReport, records };
}

export function loadResearchBundle() {
  const directory = path.join(process.cwd(), "data", "research");
  return parseResearchBundle(...(["model", "report", "examples"].map(name => fs.readFileSync(path.join(directory, `${name}.json`), "utf8")) as [string, string, string]));
}
