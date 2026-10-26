import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const cache = new Map();
function load(file) {
  if (file.endsWith(".css")) return { __esModule: true, default: new Proxy({}, { get: (_, name) => String(name) }) };
  const resolved = [file, `${file}.ts`, `${file}.tsx`].find(existsSync);
  if (!resolved) return {};
  if (cache.has(resolved)) return cache.get(resolved).exports;
  const compiled = { exports: {} };
  cache.set(resolved, compiled);
  const code = ts.transpileModule(readFileSync(resolved, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const localRequire = name => name === "server-only" ? {} : name.startsWith("@/") ? load(path.join(root, "src", name.slice(2)))
    : name.startsWith(".") ? load(path.resolve(path.dirname(resolved), name)) : require(name);
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: resolved })(localRequire, compiled, compiled.exports);
  return compiled.exports;
}
const data = load(path.join(root, "src/lib/researchData.ts"));
const domain = load(path.join(root, "src/lib/research.ts"));
const components = load(path.join(root, "src/components/ResearchExplorer.tsx"));
const words = html => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
const model = { schemaVersion: 1, algorithm: "Logistic regression (L2, C=1)",
  featureNames: ["HR", "Resp", "Temp", "O2Sat"].flatMap(v => ["value", "age", "current"].map(p => `${v}_${p}`)),
  imputation: Array(12).fill(0), mean: Array(12).fill(0), scale: Array(12).fill(1), coefficients: Array(12).fill(0), intercept: 0 };
const modelText = JSON.stringify(model);
const hash = createHash("sha256").update(modelText).digest("hex");
const cohort = { patients: 10, septicStays: 2, nonSepticStays: 8, eligibleHours: 100, positiveHours: 12,
  prevalence: .12, scoredHours: 98, unscoredHours: 2, unscoredNegativeHours: 1, unscoredPositiveHours: 1,
  auroc: .65, averagePrecision: .2, brier: .1, baselineBrier: .11, baselineAveragePrecision: .12, baselineAuroc: .5,
  threshold: .2, detectedStays: 1, missedStays: 1, falseAlarmStays: 2, negativeHours: 88,
  falsePositiveHours: 4, falsePositiveHoursPer100: 400 / 88,
  reliability: Array.from({ length: 10 }, (_, i) => ({ from: i / 10, to: (i + 1) / 10, count: i === 1 ? 98 : 0, meanScore: i === 1 ? .15 : null, eventRate: i === 1 ? .12 : null })) };
const report = { schemaVersion: 1, modelSha256: hash, seed: 2026, source: "https://physionet.org/files/challenge-2019/1.0.0/training/", datasetVersion: "1.0.0",
  trainingPatients: 28, trainingScoredHours: 300, trainingPrevalence: .1, threshold: .2,
  inputManifestSha256: { A: "a".repeat(64), B: "b".repeat(64) }, packages: { "scikit-learn": "1.8.0" },
  exclusions: { A: { rawPatients: 50, rawHours: 500, invalidValues: 0, reasons: { left_censored: 2 } }, B: { rawPatients: 10, rawHours: 120, invalidValues: 0, reasons: {} } },
  validation: cohort, internalTest: cohort, externalTest: cohort };
const record = { id: "A:p000001", label: "Research record 1", source: "physionet2019", sourceSha256: "c".repeat(64), inferredOnsetHour: 9,
  hours: Array.from({ length: 9 }, (_, hour) => ({ hour, heartRate: 84 + hour, respRate: 17, spo2: 96, tempC: hour === 3 ? null : 37, risk: hour === 0 ? null : .2 })) };
const examples = { schemaVersion: 1, modelSha256: hash, records: [record, { ...record, id: "A:p000002", label: "Research record 2", inferredOnsetHour: null }] };
function parse(m = modelText, r = report, e = examples) {
  assert.equal(typeof data.parseResearchBundle, "function", "Artifact validation must be implemented");
  return data.parseResearchBundle(m, JSON.stringify(r), JSON.stringify(e));
}

test("research artifacts are validated against the exact exported model bytes", () => {
  assert.equal(parse().report.internalTest.patients, 10);
  assert.throws(() => parse(modelText + " "), /model|hash/i);
  assert.throws(() => parse(modelText, { ...report, schemaVersion: 2 }), /schema/i);
  assert.throws(() => parse(modelText, { ...report, internalTest: { ...cohort, auroc: 2 } }), /auroc/i);
});
test("artifact validation rejects invalid times, scores, source and count mismatches", () => {
  assert.equal(typeof data.parseResearchBundle, "function", "Artifact validation must be implemented");
  const variants = [
    { ...record, source: "synthetic" },
    { ...record, hours: [] },
    { ...record, hours: [{ ...record.hours[0], hour: -1 }] },
    { ...record, hours: [{ ...record.hours[0], risk: 1.1 }] },
    { ...record, hours: [{ ...record.hours[0], tempC: 100 }] },
  ];
  for (const bad of variants) assert.throws(() => parse(modelText, report, { ...examples, records: [bad, examples.records[1]] }));
  assert.throws(() => parse(modelText, { ...report, internalTest: { ...cohort, missedStays: 99 } }));
  assert.throws(() => parse(modelText, { ...report, internalTest: { ...cohort, reliability: cohort.reliability.map((b, i) => i === 1 ? { ...b, eventRate: null } : b) } }));
});
test("research snapshots reveal no future rows and retain historical temperature as historical", () => {
  assert.equal(typeof domain.researchSnapshot, "function", "Research snapshots must be implemented");
  const snapshot = domain.researchSnapshot(record, 3);
  assert.equal(snapshot.visible.length, 4);
  assert.equal(snapshot.current.tempC, null);
  assert.match(snapshot.summary, /Temperature: no reading at this hour/);
  assert.match(snapshot.summary, /37\.0 °C at hour 2, 1 h earlier/);
  assert.doesNotMatch(snapshot.summary, /onset|Synthetic|chance|probability of/i);
  const changed = { ...record, hours: record.hours.map(r => r.hour > 3 ? { ...r, tempC: 44, risk: .99 } : r) };
  assert.deepEqual(domain.researchSnapshot(changed, 3), snapshot);
  assert.equal(domain.researchSnapshot(record, -5).current.hour, 0);
});
test("research view starts at hour zero with an honest unavailable-score state", () => {
  assert.equal(typeof components.ResearchExplorer, "function", "Research explorer must be implemented");
  const html = renderToStaticMarkup(React.createElement(components.ResearchExplorer, { records: examples.records, threshold: .2 }));
  assert.match(words(html), /Hour 0 of 8/);
  assert.match(words(html), /Experimental model score/);
  assert.match(words(html), /No score/);
  assert.match(words(html), /Precomputed/);
  assert.doesNotMatch(words(html), /Low risk|AI analysis|Gemini|62% chance|Synthetic demo/);
});
test("selected research hour renders synchronized measurements and only revealed rows", () => {
  assert.equal(typeof components.ResearchRecordView, "function", "Research record view must be implemented");
  const html = renderToStaticMarkup(React.createElement(components.ResearchRecordView, { record, index: 3, threshold: .2, onIndexChange: () => {} }));
  assert.match(words(html), /Hour 3 of 8/);
  assert.match(words(html), /87/);
  assert.match(words(html), /Not recorded this hour/);
  const table = html.match(/<tbody>([\s\S]*?)<\/tbody>/)[1];
  assert.equal((table.match(/<tr>/g) ?? []).length, 4);
  assert.doesNotMatch(words(table), /Hour 4/);
  assert.match(html, /aria-label="Research hour"/);
});

test("published research page validates real artifacts and states the false-alarm limitation", () => {
  const real = data.loadResearchBundle();
  assert.equal(real.report.exclusions.A.rawPatients, 20336);
  assert.equal(real.report.exclusions.B.rawPatients, 20000);
  const page = load(path.join(root, "src/app/research/page.tsx"));
  const html = words(renderToStaticMarkup(React.createElement(page.default)));
  assert.match(html, /This threshold generates too many false alerts for clinical use/);
  assert.match(html, /No sensor or live clinical model is connected/);
  assert.match(html, /Hospital B/);
});

test("a completed reference window with too few readings is not still building", () => {
  const sparse = { ...record, hours: Array.from({length: 13}, (_, hour) => ({ ...record.hours[0], hour, tempC: hour === 12 ? 37 : null })) };
  const html = words(renderToStaticMarkup(React.createElement(components.ResearchRecordView, {record:sparse, index:12, threshold:.2, onIndexChange:()=>{}})));
  assert.ok(html.includes("Not enough initial readings to compare."));
});
