// Display settings for the four vital-sign tiles, plus small helpers.

import type { VitalKey, Vitals } from "./types";

export type VitalInfo = {
  key: VitalKey;
  label: string;
  unit: string;
  sensor: string;
  /** Typical adult resting range, shown as context under the number. */
  typical: string;
  decimals: number;
  /** CSS colour variable for the tile's small identity mark (see globals.css). */
  accent: string;
};

export const VITALS: VitalInfo[] = [
  {
    key: "heartRate",
    label: "Heart rate",
    unit: "bpm",
    sensor: "mmWave radar",
    typical: "60–100",
    decimals: 0,
    accent: "var(--color-vital-hr)",
  },
  {
    key: "respRate",
    label: "Breathing rate",
    unit: "breaths/min",
    sensor: "mmWave radar",
    typical: "12–20",
    decimals: 0,
    accent: "var(--color-vital-rr)",
  },
  {
    key: "tempC",
    label: "Temperature",
    unit: "°C",
    sensor: "Temperature probe",
    typical: "36.5–37.5",
    decimals: 1,
    accent: "var(--color-vital-temp)",
  },
  {
    key: "spo2",
    label: "Oxygen (SpO₂)",
    unit: "%",
    sensor: "Pulse oximeter",
    typical: "95–100",
    decimals: 0,
    accent: "var(--color-vital-spo2)",
  },
];

/**
 * The most recent non-empty value of one vital at or before `index`.
 * Sensors miss readings now and then (in hospital records, temperature is
 * often only taken every few hours), so tiles show the last known value
 * and say how old it is, the way a bedside chart does.
 */
export function lastKnown<T extends Vitals>(
  rows: T[],
  key: VitalKey,
  index: number,
): { value: number; index: number } | null {
  for (let i = Math.min(index, rows.length - 1); i >= 0; i--) {
    const value = rows[i][key];
    if (value !== null && value !== undefined) return { value, index: i };
  }
  return null;
}

export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

export function formatRisk(risk: number | null | undefined): string {
  return risk === null || risk === undefined ? "--" : risk.toFixed(2);
}
