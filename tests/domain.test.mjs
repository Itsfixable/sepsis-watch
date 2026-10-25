import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

// Exercise the actual domain modules without adding a test framework.
const compiled = mkdtempSync(path.join(tmpdir(), "sepsiswatch-tests-"));
after(() => rmSync(compiled, { recursive: true, force: true }));
for (const name of ["thresholds", "replaySummary", "validateReading"]) {
  const source = readFileSync(new URL(`../src/lib/${name}.ts`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  writeFileSync(path.join(compiled, `${name}.js`), output.outputText);
}
const require = createRequire(import.meta.url);
const { replaySummary, firstRedHour } = require(path.join(compiled, "replaySummary.js"));
const { riskLevel } = require(path.join(compiled, "thresholds.js"));
const { validateReading } = require(path.join(compiled, "validateReading.js"));
const record = (onset, hours, source = "synthetic") => ({ source, sepsisOnsetHour: onset, hours: hours.map(([hour, risk]) => ({ hour, risk })) });

test("replay distinguishes early, simultaneous, late, missed, false alarm, and quiet outcomes", () => {
  for (const [onset, hours, expected] of [
    [8, [[0, 0.1], [5, 0.6]], "early"],
    [5, [[0, 0.1], [5, 0.6]], "same-hour"],
    [3, [[0, 0.1], [5, 0.6]], "late"],
    [5, [[0, 0.1], [5, 0.3]], "missed"],
    [null, [[0, 0.1], [5, 0.6]], "false-alarm"],
    [null, [[0, 0.1], [5, 0.3]], "quiet"],
  ]) assert.equal(replaySummary(record(onset, hours)).outcome, expected);
});

test("synthetic outcomes use simulated onset and accurate lead time", () => {
  const summary = replaySummary(record(40, [[0, 0.1], [35, 0.6], [47, 0.9]]));
  assert.match(summary.text, /5 hours before simulated sepsis onset/);
  assert.doesNotMatch(summary.text, /doctors|recognized/);
});

test("hospital outcomes use recorded onset without claiming clinician recognition", () => {
  assert.match(replaySummary(record(6, [[5, 0.6]], "physionet2019")).text, /1 hour before recorded sepsis onset/);
});

test("first warning handles missing scores and includes the exact threshold", () => {
  assert.equal(firstRedHour(record(null, [[0, null], [1, 0.599], [2, 0.6], [3, 0.9]]).hours), 2);
  assert.equal(firstRedHour(record(null, [[0, null], [1, 0.1]]).hours), null);
});

test("risk levels classify boundaries and missing scores", () => {
  for (const [score, expected] of [[null, "none"], [undefined, "none"], [NaN, "none"], [0, "green"], [0.299, "green"], [0.3, "yellow"], [0.599, "yellow"], [0.6, "red"], [1, "red"]]) assert.equal(riskLevel(score), expected);
});

test("included replay files retain honest scenario descriptions", () => {
  for (const id of ["patient-a", "patient-b", "patient-c"]) {
    const replay = JSON.parse(readFileSync(new URL(`../data/replays/${id}.json`, import.meta.url), "utf8"));
    assert.equal(replay.source, "synthetic");
    assert.doesNotMatch(replaySummary(replay).text, /doctors recognized/);
    assert.match(replaySummary(replay).text, /simulated|scenario/);
  }
});

test("reading validation allows missing sensors and rejects malformed input", () => {
  const reading = { timestamp: "2026-10-24T12:00:00Z", risk: 0.2, heartRate: 80, respRate: 16, tempC: null, spo2: 98 };
  assert.equal(validateReading(reading).ok, true);
  for (const risk of [-0.1, 1.1, null, "0.2"]) assert.equal(validateReading({ ...reading, risk }).ok, false);
  assert.equal(validateReading({ ...reading, timestamp: "not-a-date" }).ok, false);
  assert.equal(validateReading({ ...reading, heart_rate: 80 }).ok, false);
});

test("four-vital NEWS2 scores the bands and carries vitals forward", () => {
  const source = readFileSync(new URL("../src/lib/news2.ts", import.meta.url), "utf8");
  const out = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  writeFileSync(path.join(compiled, "news2.js"), out.outputText);
  const { news2, news2Series, firstNews2AlertHour, news2Comparison } = require(path.join(compiled, "news2.js"));
  assert.equal(news2({ heartRate: 80, respRate: 16, tempC: 37, spo2: 97 }), 0);
  assert.equal(news2({ heartRate: 115, respRate: 22, tempC: 38.5, spo2: 93 }), 2 + 2 + 1 + 2);
  assert.equal(news2({ heartRate: 80, respRate: 16, tempC: null, spo2: 97 }), null);
  const hours = [
    { hour: 0, heartRate: 80, respRate: 16, tempC: 37, spo2: 97, risk: 0.1 },
    { hour: 1, heartRate: 115, respRate: 22, tempC: null, spo2: 93, risk: 0.7 },
  ];
  assert.deepEqual(news2Series(hours), [0, 6]);
  assert.equal(firstNews2AlertHour(hours), 1);
  assert.match(news2Comparison(1, 4), /3 hours later/);
  assert.match(news2Comparison(4, 1), /alerted first/);
});
