import type { ReplayHour, ReplayRecord, VitalKey } from "./types";
import { VITALS } from "./vitals";

export const DEMO_INTERVAL_MS = 3000;
const INITIAL_OBSERVATIONS = 24;

export type DemoSession = { count: number; playing: boolean };
export type DemoAction = { type: "tick" | "toggle" | "restart"; length: number };

const wholeCount = (value: number) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

export function demoRecords(records: ReplayRecord[]): ReplayRecord[] {
  return records.filter((record) => record.source === "synthetic" && record.hours.length > 0);
}

export function initialDemoSession(length: number, playing = true): DemoSession {
  const total = wholeCount(length);
  const count = Math.min(INITIAL_OBSERVATIONS, total);
  return { count, playing: playing && count < total };
}

export function demoSessionReducer(state: DemoSession, action: DemoAction): DemoSession {
  const total = wholeCount(action.length);
  const count = Math.min(wholeCount(state.count), total);
  if (action.type === "restart") return initialDemoSession(total, false);
  if (action.type === "toggle") return { count, playing: count < total && !state.playing };
  if (!state.playing || count >= total) return { count, playing: false };
  return { count: count + 1, playing: count + 1 < total };
}

/** Derive every visible panel from the same revealed prefix, never from future rows. */
export function demoSnapshot(hours: ReplayHour[], count: number) {
  const rows = hours.slice(0, wholeCount(count));
  const current = rows.at(-1) ?? null;
  const tiles = Object.fromEntries(VITALS.map(({ key, unit, decimals }) => {
    const value = current?.[key] ?? null;
    const earlier = value === null ? rows.slice(0, -1).findLast((row) => row[key] !== null) : undefined;
    const note = value !== null ? "Recorded this simulated hour" : earlier && current
      ? `Not recorded · Last: ${earlier[key]!.toFixed(decimals)} ${unit} · ${current.hour - earlier.hour} h earlier`
      : "Not recorded · No earlier reading";
    return [key, { value, note }];
  })) as Record<VitalKey, { value: number | null; note: string }>;
  return { rows, current, tiles };
}
