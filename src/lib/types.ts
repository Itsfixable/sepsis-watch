// Shared data shapes used by the API, the pages and the replay files.
// If you change a shape here, TypeScript will point out every file that
// needs to change with it.

/**
 * The four vital signs the bedside unit measures.
 * A value is `null` when a sensor had no reading that hour
 * (for example, the pulse oximeter slipped off the finger).
 */
export type Vitals = {
  /** Heart rate, beats per minute (mmWave radar). */
  heartRate: number | null;
  /** Breathing rate, breaths per minute (mmWave radar). */
  respRate: number | null;
  /** Body temperature, degrees Celsius (temperature probe). */
  tempC: number | null;
  /** Blood oxygen saturation, percent (pulse oximeter). */
  spo2: number | null;
};

export type VitalKey = keyof Vitals;

/** One hourly reading sent by the Raspberry Pi to POST /api/readings. */
export type Reading = Vitals & {
  /** When the reading was taken, as an ISO 8601 string, e.g. "2026-10-01T14:00:00Z". */
  timestamp: string;
  /** The model's sepsis risk score for this hour, from 0 (low) to 1 (high). */
  risk: number;
};

/** A reading as the server keeps it: the Pi's data plus when the server got it. */
export type StoredReading = Reading & {
  /** When the server received the reading (ISO 8601). Used to spot a silent Pi. */
  receivedAt: string;
};

/** What GET /api/readings returns. */
export type ReadingsResponse = {
  readings: StoredReading[];
};

/** What the API returns when a request is rejected. */
export type ApiError = {
  error: string;
  details?: string[];
};

/** Colour of the status light. "none" means there is no score yet. */
export type RiskLevel = "none" | "green" | "yellow" | "red";

/** One hour of a replayed hospital stay. */
export type ReplayHour = Vitals & {
  /** Hours since the record started (0 = first hour). */
  hour: number;
  /** Model risk score for this hour, or null if the model gave no score. */
  risk: number | null;
};

/** A whole replay file from data/replays/. */
export type ReplayRecord = {
  /** Short id, matches the file name (e.g. "patient-a" for patient-a.json). */
  id: string;
  /** Name shown in the patient picker. */
  label: string;
  /** One or two sentences about the patient, shown under the picker. */
  description: string;
  /** "synthetic" = made-up demo patient; "physionet2019" = real de-identified record. */
  source: "synthetic" | "physionet2019";
  age: number | null;
  sex: "F" | "M" | null;
  /**
   * Hour sepsis was clinically recognized, or null if the patient never
   * developed sepsis. For PhysioNet 2019 records this is the first hour
   * with SepsisLabel = 1, plus 6.
   */
  sepsisOnsetHour: number | null;
  hours: ReplayHour[];
};
