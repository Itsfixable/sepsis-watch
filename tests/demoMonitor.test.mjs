import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const compiled = mkdtempSync(path.join(tmpdir(), "sepsiswatch-demo-tests-"));
after(() => rmSync(compiled, { recursive: true, force: true }));
for (const name of ["vitals", "demoMonitor", "monitorMode"]) {
  const file = new URL(`../src/lib/${name}.ts`, import.meta.url);
  if (existsSync(file)) writeFileSync(path.join(compiled, `${name}.js`), ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText);
}
const require = createRequire(import.meta.url);
const load = (name) => existsSync(path.join(compiled, `${name}.js`)) ? require(path.join(compiled, `${name}.js`)) : {};
const demo = load("demoMonitor");
const mode = load("monitorMode");
const patient = JSON.parse(readFileSync(new URL("../data/replays/patient-a.json", import.meta.url), "utf8"));

test("demo starts with 24 observations and reveals exactly one per tick", () => {
  assert.equal(typeof demo.initialDemoSession, "function");
  const first = demo.initialDemoSession(48);
  assert.deepEqual(first, { count: 24, playing: true });
  assert.deepEqual(demo.demoSessionReducer(first, { type: "tick", length: 48 }), { count: 25, playing: true });
  assert.deepEqual(first, { count: 24, playing: true }, "another browser session must not be mutated");
});

test("paused and restarted sessions reject queued timer ticks", () => {
  assert.equal(typeof demo.demoSessionReducer, "function");
  const paused = demo.demoSessionReducer({ count: 35, playing: true }, { type: "toggle", length: 48 });
  assert.deepEqual(paused, { count: 35, playing: false });
  assert.deepEqual(demo.demoSessionReducer(paused, { type: "tick", length: 48 }), paused);
  const restarted = demo.demoSessionReducer(paused, { type: "restart", length: 48 });
  assert.deepEqual(restarted, { count: 24, playing: false });
  assert.deepEqual(demo.demoSessionReducer(restarted, { type: "tick", length: 48 }), restarted);
  assert.deepEqual(demo.demoSessionReducer(restarted, { type: "toggle", length: 48 }), { count: 24, playing: true });
});

test("last observation stops playback and cannot resume beyond the record", () => {
  assert.equal(typeof demo.demoSessionReducer, "function");
  const ended = demo.demoSessionReducer({ count: 47, playing: true }, { type: "tick", length: 48 });
  assert.deepEqual(ended, { count: 48, playing: false });
  for (const type of ["tick", "toggle"]) assert.deepEqual(demo.demoSessionReducer(ended, { type, length: 48 }), ended);
});

test("empty and short records never start a timer or exceed their length", () => {
  assert.equal(typeof demo.initialDemoSession, "function");
  for (const [length, count] of [[0, 0], [1, 1], [12, 12], [24, 24], [-1, 0], [NaN, 0]]) {
    const state = demo.initialDemoSession(length);
    assert.deepEqual(state, { count, playing: false });
    assert.deepEqual(demo.demoSessionReducer(state, { type: "tick", length }), state);
  }
});

test("demo excludes hospital records and empty scenarios", () => {
  assert.equal(typeof demo.demoRecords, "function");
  assert.deepEqual(demo.demoRecords([patient, { ...patient, id: "hospital", source: "physionet2019" }, { ...patient, hours: [] }]).map((r) => r.id), ["patient-a"]);
});

test("snapshot reveals only arrived observations and preserves a missing current temperature", () => {
  assert.equal(typeof demo.demoSnapshot, "function");
  const initial = demo.demoSnapshot(patient.hours, 24);
  assert.equal(initial.rows.length, 24);
  assert.equal(initial.current.hour, 23);
  assert.equal(initial.rows.some((r) => r.hour >= 24), false);
  const missing = demo.demoSnapshot(patient.hours, 36);
  assert.equal(missing.current.hour, 35);
  assert.equal(missing.tiles.tempC.value, null);
  assert.match(missing.tiles.tempC.note, /not recorded.*38\.1 °C.*1 h earlier/i);
  assert.equal(missing.tiles.heartRate.value, 113);
  assert.equal(missing.current.risk, 0.62);
});

test("snapshot does not invent earlier measurements or a missing score", () => {
  assert.equal(typeof demo.demoSnapshot, "function");
  const rows = [{ hour: 0, risk: null, heartRate: null, respRate: null, tempC: null, spo2: null }];
  const snapshot = demo.demoSnapshot(rows, 50);
  assert.equal(snapshot.current.risk, null);
  assert.equal(snapshot.rows.length, 1);
  assert.match(snapshot.tiles.heartRate.note, /no earlier reading/i);
  for (const count of [0, -1, NaN]) {
    assert.equal(demo.demoSnapshot(rows, count).current, null);
    assert.deepEqual(demo.demoSnapshot(rows, count).rows, []);
  }
});

test("local readings require explicit development opt-in and are never enabled on Vercel", () => {
  assert.equal(typeof mode.localReadingsEnabled, "function");
  for (const env of [{}, { NODE_ENV: "development" }, { SEPSISWATCH_LOCAL_API: "1" },
    { NODE_ENV: "production", SEPSISWATCH_LOCAL_API: "1" },
    { NODE_ENV: "development", SEPSISWATCH_LOCAL_API: "true" },
    { NODE_ENV: "development", SEPSISWATCH_LOCAL_API: "1", VERCEL: "1" },
    { NODE_ENV: "development", SEPSISWATCH_LOCAL_API: "1", VERCEL: "true" }]) {
    assert.equal(mode.localReadingsEnabled(env), false, JSON.stringify(env));
  }
  assert.equal(mode.localReadingsEnabled({ NODE_ENV: "development", SEPSISWATCH_LOCAL_API: "1" }), true);
});
