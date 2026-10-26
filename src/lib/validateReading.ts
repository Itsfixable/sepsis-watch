// Checks the JSON the Raspberry Pi sends before we store it.
// Bad data on a medical dashboard is worse than no data, so anything
// unexpected is rejected with a message that says exactly what was wrong.

import type { Reading, VitalKey } from "./types";

type Result = { ok: true; reading: Reading } | { ok: false; errors: string[] };

// The widest values we accept for each vital. These are "is the sensor
// working?" limits, not normal ranges: a reading outside them is almost
// certainly a sensor or typing error.
const VITAL_LIMITS: Record<VitalKey, { min: number; max: number; unit: string }> = {
  heartRate: { min: 20, max: 250, unit: "beats/min" },
  respRate: { min: 2, max: 80, unit: "breaths/min" },
  tempC: { min: 25, max: 45, unit: "°C" },
  spo2: { min: 50, max: 100, unit: "%" },
};

const ALLOWED_FIELDS = ["timestamp", "risk", ...Object.keys(VITAL_LIMITS)];

export function validateReading(body: unknown): Result {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, errors: ["Body must be one JSON object, like { \"timestamp\": ..., \"risk\": ... }."] };
  }
  const data = body as Record<string, unknown>;
  const errors: string[] = [];

  // Catch typos such as "heart_rate" instead of "heartRate".
  for (const key of Object.keys(data)) {
    if (!ALLOWED_FIELDS.includes(key)) {
      errors.push(`Unknown field "${key}". Allowed fields: ${ALLOWED_FIELDS.join(", ")}.`);
    }
  }

  // timestamp: required, must be a date string with a time zone.
  let timestamp = "";
  if (typeof data.timestamp !== "string") {
    errors.push('"timestamp" is required and must be a string, e.g. "2026-10-01T14:00:00Z".');
  } else if (!/(Z|[+-]\d{2}:?\d{2})$/.test(data.timestamp) || Number.isNaN(Date.parse(data.timestamp))) {
    errors.push(
      `"timestamp" must be ISO 8601 with a time zone, e.g. "2026-10-01T14:00:00Z" (got "${data.timestamp}").`,
    );
  } else {
    timestamp = new Date(data.timestamp).toISOString();
  }

  // risk: required number between 0 and 1.
  if (typeof data.risk !== "number" || !Number.isFinite(data.risk)) {
    errors.push('"risk" is required and must be a number from 0 to 1.');
  } else if (data.risk < 0 || data.risk > 1) {
    errors.push(`"risk" must be between 0 and 1 (got ${data.risk}).`);
  }

  // Vitals: the field must be present. Use null when a sensor had no reading.
  const vitals = {} as Record<VitalKey, number | null>;
  for (const [key, limits] of Object.entries(VITAL_LIMITS) as [VitalKey, (typeof VITAL_LIMITS)[VitalKey]][]) {
    const value = data[key];
    if (!(key in data)) {
      errors.push(`"${key}" is missing. Send null if the sensor had no reading.`);
    } else if (value === null) {
      vitals[key] = null;
    } else if (typeof value !== "number" || !Number.isFinite(value)) {
      errors.push(`"${key}" must be a number or null.`);
    } else if (value < limits.min || value > limits.max) {
      errors.push(`"${key}" must be between ${limits.min} and ${limits.max} ${limits.unit} (got ${value}).`);
    } else {
      vitals[key] = value;
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    reading: {
      timestamp,
      risk: data.risk as number,
      heartRate: vitals.heartRate,
      respRate: vitals.respRate,
      tempC: vitals.tempC,
      spo2: vitals.spo2,
    },
  };
}
