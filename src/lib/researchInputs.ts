import type { ReplayHour } from "./types";

const vitals = [
  { key: "heartRate", label: "Heart rate", feature: "HR", unit: "bpm", low: 20, high: 250 },
  { key: "respRate", label: "Breathing rate", feature: "Resp", unit: "breaths/min", low: 2, high: 80 },
  { key: "tempC", label: "Temperature", feature: "Temp", unit: "°C", low: 25, high: 45 },
  { key: "spo2", label: "Oxygen saturation", feature: "O2Sat", unit: "%", low: 50, high: 100 },
] as const;
export type ResearchVitalKey = typeof vitals[number]["key"];

/** Reconstruct the Python feature pipeline for a validated, revealed prefix only.
 * This is input provenance, not inference or a causal explanation of the score.
 * Keep parity coverage against scripts/research/data.py and model.py.
 */
export function researchInputTrace(visible: ReplayHour[], imputation: number[]) {
  if (imputation.length !== 12 || !imputation.every(Number.isFinite)) throw new Error("Invalid research imputation metadata");
  const currentHour = visible.at(-1)?.hour;
  const rows = currentHour === undefined ? [] : vitals.map((vital, column) => {
    const valid = (value: number | null) => value !== null && Number.isFinite(value) && value >= vital.low && value <= vital.high;
    const currentValue = visible.at(-1)![vital.key];
    const current = valid(currentValue) ? currentValue : null;
    let observation: ReplayHour | undefined;
    for (let index = visible.length - 1; index >= 0; index--) {
      if (valid(visible[index][vital.key])) { observation = visible[index]; break; }
    }
    const age = observation ? currentHour - observation.hour : null;
    const recent = age !== null && age <= 6;
    const source: "current" | "earlier" | "median" = current !== null ? "current" : recent ? "earlier" : "median";
    return { key: vital.key, label: vital.label, feature: vital.feature, unit: vital.unit,
      current, value: recent ? observation![vital.key]! : imputation[column * 3],
      source, observedHour: observation?.hour ?? null, age,
      ageInput: recent ? age! : 7, currentInput: current === null ? 0 : 1 };
  });
  return { scorable: rows.some(row => row.source !== "median"), rows,
    features: rows.flatMap(row => [row.value, row.ageInput, row.currentInput]) };
}

/** Retrospective navigation only. Each destination is inspected using its own prefix. */
export function researchInputExamples(hours: ReplayHour[], imputation: number[]) {
  const found = new Map<"median" | "current" | "earlier", number>();
  for (let index = 0; index < hours.length && found.size < 3; index++) {
    if (hours[index].risk === null) continue;
    const trace = researchInputTrace(hours.slice(0, index + 1), imputation);
    const temperature = trace.rows.find(row => row.key === "tempC");
    if (trace.scorable && temperature && !found.has(temperature.source)) found.set(temperature.source, index);
  }
  return (["median", "current", "earlier"] as const).flatMap(source => {
    const index = found.get(source);
    return index === undefined ? [] : [{ source, index }];
  });
}

/** Display-only history. Missing hours never become invented measurements. */
export function researchInputHistory(visible: ReplayHour[], imputation: number[], key: ResearchVitalKey, scoreAvailable: boolean) {
  const trace = researchInputTrace(visible, imputation);
  const row = trace.rows.find(item => item.key === key);
  const hour = visible.at(-1)?.hour;
  if (!row || hour === undefined) return null;
  const vital = vitals.find(item => item.key === key)!;
  const used = trace.scorable && scoreAvailable;
  const history = visible.filter(item => item.hour >= hour - 7 && item.hour <= hour).map(item => {
    const raw = item[key];
    const valid = raw !== null && Number.isFinite(raw) && raw >= vital.low && raw <= vital.high;
    return { hour: item.hour, value: valid ? raw : null, excluded: raw !== null && !valid,
      expired: valid && hour - item.hour > 6, isCurrent: item.hour === hour,
      usedByModel: used && row.source !== "median" && item.hour === row.observedHour };
  });
  return { row, history, valueUsed: used ? row.value : null, used };
}
