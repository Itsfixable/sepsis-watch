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
  assert.doesNotMatch(text, /sepsis detected|healthy|safe to wait/i);
});
