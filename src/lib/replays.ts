// Reads the replay files in data/replays/ (server side only).
// Drop a new .json file in that folder and it appears in the Replay page's
// patient picker. If a file is broken, the error names the file and field.

import fs from "node:fs";
import path from "node:path";
import type { ReplayHour, ReplayRecord } from "./types";

const REPLAY_DIR = path.join(process.cwd(), "data", "replays");

export function loadReplays(): ReplayRecord[] {
  if (!fs.existsSync(REPLAY_DIR)) return [];

  return fs
    .readdirSync(REPLAY_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      const file = path.join("data", "replays", name);
      let parsed: unknown;
      try {
        parsed = JSON.parse(fs.readFileSync(path.join(REPLAY_DIR, name), "utf8"));
      } catch (error) {
        throw new Error(`${file} is not valid JSON: ${(error as Error).message}`);
      }
      return checkReplay(parsed, file, name.replace(/\.json$/, ""));
    });
}

function checkReplay(data: unknown, file: string, fallbackId: string): ReplayRecord {
  const fail = (message: string): never => {
    throw new Error(`${file}: ${message}`);
  };
  if (typeof data !== "object" || data === null) fail("must be a JSON object.");
  const r = data as Partial<ReplayRecord>;

  if (!Array.isArray(r.hours) || r.hours.length === 0) fail('"hours" must be a non-empty list.');
  if (r.sepsisOnsetHour !== null && typeof r.sepsisOnsetHour !== "number") {
    fail('"sepsisOnsetHour" must be a number, or null if the patient never developed sepsis.');
  }

  const isNumOrNull = (v: unknown) => v === null || (typeof v === "number" && Number.isFinite(v));
  const hours = [...(r.hours as ReplayHour[])].sort((a, b) => a.hour - b.hour);
  hours.forEach((h, i) => {
    if (typeof h.hour !== "number") fail(`hours[${i}].hour must be a number.`);
    if (!isNumOrNull(h.risk) || (h.risk !== null && (h.risk < 0 || h.risk > 1))) {
      fail(`hours[${i}].risk must be a number from 0 to 1, or null.`);
    }
    for (const key of ["heartRate", "respRate", "tempC", "spo2"] as const) {
      if (!isNumOrNull(h[key])) fail(`hours[${i}].${key} must be a number or null.`);
    }
  });

  return {
    id: r.id ?? fallbackId,
    label: r.label ?? fallbackId,
    description: r.description ?? "",
    source: r.source === "physionet2019" ? "physionet2019" : "synthetic",
    age: typeof r.age === "number" ? r.age : null,
    sex: r.sex === "F" || r.sex === "M" ? r.sex : null,
    sepsisOnsetHour: r.sepsisOnsetHour ?? null,
    hours,
  };
}
