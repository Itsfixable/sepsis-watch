import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const compiled = mkdtempSync(path.join(tmpdir(), "sepsiswatch-story-tests-"));
after(() => rmSync(compiled, { recursive: true, force: true }));
const source = new URL("../src/lib/patientStory.ts", import.meta.url);
writeFileSync(path.join(compiled, "vitals.js"), ts.transpileModule(readFileSync(new URL("../src/lib/vitals.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText);
if (existsSync(source)) {
  writeFileSync(path.join(compiled, "patientStory.js"), ts.transpileModule(readFileSync(source, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText);
}
const require = createRequire(import.meta.url);
const story = existsSync(source) ? require(path.join(compiled, "patientStory.js")) : {};
const hour = (at, hr, temp = null) => ({ hour: at, heartRate: hr, respRate: null, tempC: temp, spo2: null, risk: null });

test("an early snapshot never borrows reference readings from the future", () => {
  assert.equal(typeof story.patientSnapshot, "function", "patientSnapshot must be implemented");
  const rows = [hour(0, 80), hour(1, 82), hour(2, 84), hour(3, 200)];
  assert.equal(story.patientSnapshot(rows, 1).observations[0].reference, null);
  assert.equal(story.patientSnapshot(rows, 2).observations[0].reference, 82);
  assert.equal(story.patientSnapshot(rows, 2).referenceComplete, false);
});

test("reference uses the median of the first twelve hours and then stays fixed", () => {
  assert.equal(typeof story.patientSnapshot, "function");
  const rows = [hour(10, 80), hour(11, 82), hour(12, 200), hour(22, 140), hour(30, 150)];
  const result = story.patientSnapshot(rows, 4);
  assert.equal(result.observations[0].reference, 82);
  assert.equal(result.observations[0].delta, 68);
  assert.equal(result.observations[0].referenceCount, 3);
  assert.equal(result.referenceComplete, true);
});

test("missing current readings do not masquerade as fresh measurements or deltas", () => {
  assert.equal(typeof story.patientSnapshot, "function");
  const result = story.patientSnapshot([hour(0, 80), hour(1, 82), hour(2, 84), hour(8, null)], 3);
  assert.equal(result.observations[0].current, null);
  assert.equal(result.observations[0].lastValue, 84);
  assert.equal(result.observations[0].ageHours, 6);
  assert.equal(result.observations[0].delta, null);
  assert.equal(result.freshCount, 0);
  assert.equal(result.observations[1].lastValue, null);
});

test("Patient A at hour 35 reports observed changes and the missing temperature", () => {
  assert.equal(typeof story.patientSnapshot, "function");
  const record = JSON.parse(readFileSync(new URL("../data/replays/patient-a.json", import.meta.url), "utf8"));
  const result = story.patientSnapshot(record.hours, 35);
  assert.equal(result.observations[0].reference, 84);
  assert.equal(result.observations[0].delta, 29);
  assert.equal(result.observations[2].current, null);
  assert.equal(result.observations[2].lastValue, 38.1);
  assert.equal(result.observations[2].ageHours, 1);
  assert.equal(result.freshCount, 3);
});

test("empty, out-of-range and non-finite inputs remain safe", () => {
  assert.equal(typeof story.patientSnapshot, "function");
  assert.equal(story.patientSnapshot([], 0), null);
  assert.equal(story.patientSnapshot([hour(0, 80), hour(1, NaN)], 9).observations[0].current, null);
  assert.equal(story.patientSnapshot([hour(0, 80), hour(1, 100)], -1).hour, 0);
});

test("a copied observation summary preserves missingness and prototype context", () => {
  assert.equal(typeof story.observationSummary, "function");
  const record = JSON.parse(readFileSync(new URL("../data/replays/patient-a.json", import.meta.url), "utf8"));
  const text = story.observationSummary(record, 35);
  assert.match(text, /synthetic/i);
  assert.match(text, /not.*diagnos/i);
  assert.match(text, /113 bpm/);
  assert.match(text, /29 bpm/);
  assert.match(text, /Temperature: no reading at this hour/);
  assert.match(text, /38\.1 °C.*1 h/);
  assert.match(text, /38\.1 °C at hour 34.*1\.15 °C above/);
  assert.doesNotMatch(text, /sepsis detected|healthy|safe to wait/i);
});

test("reading descriptions include the current value, reference and signed change", () => {
  assert.equal(typeof story.observationDescription, "function");
  const item = story.patientSnapshot([hour(0, 80), hour(1, 82), hour(2, 84), hour(12, 113)], 3).observations[0];
  const text = story.observationDescription(item);
  assert.match(text, /113 bpm.*this hour/i);
  assert.match(text, /initial reference.*82 bpm/i);
  assert.match(text, /31 bpm above/i);
});

test("missing-reading descriptions distinguish the last observation from the current hour", () => {
  assert.equal(typeof story.observationDescription, "function");
  const item = story.patientSnapshot([hour(0, 80), hour(1, 82), hour(2, 84), hour(8, null)], 3).observations[0];
  const text = story.observationDescription(item);
  assert.match(text, /no reading at this hour/i);
  assert.match(text, /last recorded.*84 bpm.*6 hours earlier/i);
  assert.match(text, /no current comparison/i);
  assert.doesNotMatch(text, /above|below|unchanged/i);
});

test("reading descriptions handle an unavailable reference and an empty history", () => {
  assert.equal(typeof story.observationDescription, "function");
  const snapshot = story.patientSnapshot([hour(0, 80)], 0);
  assert.match(story.observationDescription(snapshot.observations[0]), /not enough reference readings/i);
  const missing = story.observationDescription(snapshot.observations[1]);
  assert.match(missing, /no earlier reading/i);
  assert.doesNotMatch(missing, /null|undefined|NaN/);
});

test("oxygen changes use percentage points and zero changes are not called rises", () => {
  assert.equal(typeof story.observationDescription, "function");
  const rows = [0, 1, 2, 12].map((at) => ({ ...hour(at, 80), spo2: at === 12 ? 93 : 96 }));
  const snapshot = story.patientSnapshot(rows, 3);
  const oxygen = story.observationDescription(snapshot.observations[3]);
  assert.match(oxygen, /3 percentage points below/i);
  assert.doesNotMatch(oxygen, /3 % below/);
  assert.match(story.observationDescription(snapshot.observations[0]), /unchanged/i);
});

test("reading descriptions preserve fractional medians and measured values", () => {
  const rows = [hour(0, 80), hour(1, 81), hour(2, 84), hour(3, 90), hour(12, 100.5)];
  const text = story.observationDescription(story.patientSnapshot(rows, 4).observations[0]);
  assert.match(text, /100\.5 bpm.*this hour/i);
  assert.match(text, /initial reference.*82\.5 bpm/i);
  assert.match(text, /18 bpm above/i);
});

test("earlier context preserves Patient A's historical temperature without creating a current delta", () => {
  assert.equal(typeof story.earlierObservationContext, "function");
  const record = JSON.parse(readFileSync(new URL("../data/replays/patient-a.json", import.meta.url), "utf8"));
  const snapshot = story.patientSnapshot(record.hours, 35);
  const temperature = snapshot.observations[2];
  const text = story.earlierObservationContext(temperature, snapshot.hour);
  assert.match(text, /38\.1 °C at hour 34.*1 h earlier/);
  assert.equal(temperature.reference, 36.95);
  assert.match(text, /1\.15 °C above the initial reference \(36\.95 °C\)/);
  assert.match(text, /earlier reading.*not.*current/i);
  assert.equal(temperature.current, null);
  assert.equal(temperature.delta, null);
  assert.equal(snapshot.freshCount, 3);
  assert.equal(story.earlierObservationContext(snapshot.observations[0], 35), null);
});

test("earlier context handles no history and insufficient reference without inventing comparisons", () => {
  assert.equal(typeof story.earlierObservationContext, "function");
  const snapshot = story.patientSnapshot([hour(0, 80), hour(5, null)], 1);
  assert.match(story.earlierObservationContext(snapshot.observations[0], 5), /80 bpm at hour 0.*5 h earlier/);
  assert.match(story.earlierObservationContext(snapshot.observations[0], 5), /not enough reference/i);
  const empty = story.earlierObservationContext(snapshot.observations[2], 5);
  assert.match(empty, /No earlier reading available/);
  assert.doesNotMatch(empty, /null|undefined|NaN|above|below/);
});

test("earlier context reports long gaps by hour and cannot borrow an unrevealed measurement", () => {
  assert.equal(typeof story.earlierObservationContext, "function");
  const snapshot = story.patientSnapshot([hour(10, 80), hour(11, 82), hour(12, 84), hour(30, null), hour(31, 150)], 3);
  const text = story.earlierObservationContext(snapshot.observations[0], 30);
  assert.match(text, /84 bpm at hour 12.*18 h earlier/);
  assert.match(text, /2 bpm above/);
  assert.doesNotMatch(text, /150|recent|fresh|current reading/i);
});

test("historical comparisons handle lower and unchanged values and oxygen percentage points", () => {
  assert.equal(typeof story.earlierObservationContext, "function");
  const rows = [0, 1, 2, 12, 20].map((at) => ({ ...hour(at, at === 20 ? null : 80), spo2: at === 20 ? null : at === 12 ? 93 : 96 }));
  const snapshot = story.patientSnapshot(rows, 4);
  const oxygen = story.earlierObservationContext(snapshot.observations[3], 20);
  assert.match(oxygen, /93 % at hour 12.*8 h earlier/);
  assert.match(oxygen, /3 percentage points below/);
  assert.doesNotMatch(oxygen, /3 % below/);
  const heartRate = story.earlierObservationContext(snapshot.observations[0], 20);
  assert.match(heartRate, /unchanged from the initial reference/i);
  assert.doesNotMatch(heartRate, /above|below/);
});

test("historical fractional references do not expose floating-point artifacts", () => {
  const rows = [hour(0, 80, 36.3), hour(1, 80, 36.3), hour(2, 80, 36.4), hour(3, 80, 36.4), hour(12, null)];
  const item = story.patientSnapshot(rows, 4).observations[2];
  const text = story.earlierObservationContext(item, 12);
  assert.match(text, /0\.05 °C above the initial reference \(36\.35 °C\)/);
});
