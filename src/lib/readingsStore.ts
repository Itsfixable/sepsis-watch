// Keeps readings in the server's memory (there is no database yet).
//
// Good to know:
// - Everything is lost when the server restarts. That is expected for now.
// - In development, Next.js reloads code when you save a file. Storing the
//   list on `globalThis` keeps it alive across those reloads.
// - This only works with one server process (npm run dev / npm start on
//   your laptop). Hosting that runs many copies, like Vercel, needs a
//   real database instead.

import type { Reading, StoredReading } from "./types";

/** Hourly readings, so 1,000 is about six weeks. Oldest are dropped first. */
const MAX_READINGS = 1000;

const globalStore = globalThis as typeof globalThis & {
  __sepsiswatchReadings?: StoredReading[];
};

function list(): StoredReading[] {
  globalStore.__sepsiswatchReadings ??= [];
  return globalStore.__sepsiswatchReadings;
}

/** All readings, oldest first. Returns a copy so callers can't change the store. */
export function getReadings(): StoredReading[] {
  return [...list()];
}

/**
 * Save a reading. If one already exists with the same timestamp (for
 * example, the Pi retried after a dropped connection) it is replaced
 * instead of being added twice.
 */
export function addReading(reading: Reading): { stored: StoredReading; replaced: boolean; count: number } {
  const readings = list();
  const stored: StoredReading = { ...reading, receivedAt: new Date().toISOString() };

  const existing = readings.findIndex((r) => r.timestamp === stored.timestamp);
  if (existing >= 0) {
    readings[existing] = stored;
  } else {
    readings.push(stored);
    readings.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    if (readings.length > MAX_READINGS) readings.splice(0, readings.length - MAX_READINGS);
  }

  return { stored, replaced: existing >= 0, count: readings.length };
}
