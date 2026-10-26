import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Transpile the actual components in memory; only CSS is replaced (no DOM in Node).
const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const { QueryClient, QueryClientProvider } = require("@tanstack/react-query");
const cache = new Map();
function loadSource(file) {
  if (file.endsWith(".css")) return { __esModule: true, default: new Proxy({}, { get: (_, name) => String(name) }) };
  const resolved = [file, `${file}.ts`, `${file}.tsx`].find(existsSync);
  if (!resolved) return {};
  if (cache.has(resolved)) return cache.get(resolved).exports;
  const compiledModule = { exports: {} };
  cache.set(resolved, compiledModule);
  const code = ts.transpileModule(readFileSync(resolved, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const localRequire = (name) => name.startsWith("@/") ? loadSource(path.join(root, "src", name.slice(2)))
    : name.startsWith(".") ? loadSource(path.resolve(path.dirname(resolved), name)) : require(name);
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: resolved })(localRequire, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const { DemoMonitor } = loadSource(path.join(root, "src/components/DemoMonitor.tsx"));
const patient = JSON.parse(readFileSync(new URL("../data/replays/patient-a.json", import.meta.url), "utf8"));
function render(records) {
  assert.equal(typeof DemoMonitor, "function", "DemoMonitor must be implemented");
  return renderToStaticMarkup(React.createElement(DemoMonitor, { records }));
}
const text = (html) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

test("demo Monitor renders labeled synthetic data with only the first 24 observations", () => {
  const html = render([patient]);
  const words = text(html);
  assert.match(words, /Synthetic demo data/);
  assert.match(words, /Hour 23 of 47/);
  assert.match(words, /every 3 seconds/);
  assert.match(words, /Illustrative score/);
  assert.match(words, /Pause/);
  assert.match(words, /Reset demo/);
  assert.match(html, /<th[^>]*>Simulated hour<\/th>/);
  const table = html.match(/<tbody>([\s\S]*?)<\/tbody>/)[1];
  assert.equal((table.match(/<tr>/g) ?? []).length, 24);
  assert.match(text(table), /Hour 23/);
  assert.doesNotMatch(text(table), /Hour 24/);
  assert.doesNotMatch(words, /Receiving data|Bedside unit|Low risk|Sepsis risk score/);
});

test("missing current vital is a dash with a separately labeled older measurement", () => {
  const hours = patient.hours.slice(0, 24).map((r) => ({ ...r }));
  hours[22].tempC = 38.1;
  hours[23].tempC = null;
  const html = render([{ ...patient, hours }]);
  const tile = html.match(/<article[^>]*>(?:(?!<\/article>)[\s\S])*Temperature[\s\S]*?<\/article>/)[0];
  assert.match(text(tile), /— °C/);
  assert.match(text(tile), /Not recorded.*Last: 38\.1 °C.*1 h earlier/);
  assert.doesNotMatch(text(tile), /Awaiting reading/);
});

test("missing illustrative score has a no-score state instead of a low-risk claim", () => {
  const hours = patient.hours.slice(0, 24).map((r, i) => ({ ...r, risk: i === 23 ? null : r.risk }));
  const html = render([{ ...patient, hours }]);
  assert.match(html, /aria-label="Illustrative score status"[^>]*data-level="none"/);
  assert.match(text(html), /No score/);
  assert.match(text(html), /not.*probability/i);
});

test("short records open completed and empty or hospital-only inputs never masquerade as demo patients", () => {
  assert.match(text(render([{ ...patient, hours: patient.hours.slice(0, 2) }])), /Demo complete/);
  assert.match(text(render([])), /No demo records available/);
  assert.match(text(render([{ ...patient, source: "physionet2019" }])), /No demo records available/);
  assert.match(text(render([{ ...patient, hours: [] }])), /No demo records available/);
});

test("Patient A is the default even when other synthetic scenarios precede it", () => {
  const other = { ...patient, id: "patient-b", label: "Patient B" };
  const html = render([other, patient]);
  assert.match(html, /<option value="patient-a" selected=""/);
  assert.match(text(html), /Simulated Patient A/);
});

test("local API monitor identifies itself as a synthetic-data demonstration", () => {
  const { LiveMonitor } = loadSource(path.join(root, "src/components/LiveMonitor.tsx"));
  const html = renderToStaticMarkup(React.createElement(QueryClientProvider, { client: new QueryClient() }, React.createElement(LiveMonitor)));
  assert.match(text(html), /Local API demonstration/);
  assert.match(text(html), /Synthetic data only/);
  assert.doesNotMatch(text(html), /Bedside unit|Sepsis risk score/);
});

test("local timestamp observations do not inherit the public demo's hour heading", () => {
  const { LiveMonitor } = loadSource(path.join(root, "src/components/LiveMonitor.tsx"));
  const client = new QueryClient();
  client.setQueryData(["readings"], [{
    timestamp: "2026-10-25T12:00:00Z", receivedAt: "2026-10-25T12:00:00Z",
    heartRate: 80, respRate: 16, tempC: 37, spo2: 98, risk: 0.2,
  }]);
  const html = renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(LiveMonitor)));
  assert.match(html, /<th[^>]*>Time<\/th>/);
  assert.match(html, /<th[^>]*>Demo score<\/th>/);
  assert.doesNotMatch(html, /<th[^>]*>Simulated hour<\/th>/);
  assert.match(html, /<tbody><tr>/);
});

test("detailed synthetic replay uses illustrative status instead of clinical-risk guidance", () => {
  const { ReplayPlayer } = loadSource(path.join(root, "src/components/ReplayPlayer.tsx"));
  const html = renderToStaticMarkup(React.createElement(ReplayPlayer, { replays: [patient] }));
  assert.match(html, /aria-label="Illustrative score status"/);
  assert.doesNotMatch(text(html), /Continue routine monitoring|Sepsis risk score/);
  assert.match(html, /<th[^>]*>Demo score<\/th>/);
});

test("research-record replay retains its separate source and score labels", () => {
  const { ReplayPlayer } = loadSource(path.join(root, "src/components/ReplayPlayer.tsx"));
  const html = renderToStaticMarkup(React.createElement(ReplayPlayer, { replays: [{ ...patient, source: "physionet2019" }] }));
  assert.match(text(html), /Hospital record/);
  assert.match(html, /<th[^>]*>Risk score<\/th>/);
  assert.doesNotMatch(html, /<th[^>]*>Demo score<\/th>/);
});

test("patient story surfaces historical temperature separately from current findings", () => {
  const { PatientStory } = loadSource(path.join(root, "src/components/PatientStory.tsx"));
  const html = renderToStaticMarkup(React.createElement(PatientStory, { replays: [patient] }));
  const context = text(html.match(/<aside[^>]*>([\s\S]*?)<\/aside>/)[1]);
  const earlier = text(html.match(/<div class="missingNote">([\s\S]*?)<\/div><\/div>/)[1]);
  const findings = text(html.match(/<ul class="findings">([\s\S]*?)<\/ul>/)[1]);
  assert.match(context, /1 reading not recorded this hour/);
  assert.match(earlier, /Temperature.*38\.1 °C at hour 34.*1 h earlier.*1\.15 °C above.*36\.95 °C/);
  assert.match(earlier, /earlier reading.*not.*current/i);
  assert.match(context, /3 current readings differ/);
  assert.doesNotMatch(findings, /Temperature/);
});

test("patient story distinguishes no history from a timestamped earlier measurement", () => {
  const { PatientStory } = loadSource(path.join(root, "src/components/PatientStory.tsx"));
  const record = { ...patient, hours: patient.hours.map((row) => ({ ...row, tempC: null })) };
  const html = renderToStaticMarkup(React.createElement(PatientStory, { replays: [record] }));
  const context = text(html.match(/<div class="missingNote">([\s\S]*?)<\/div><\/div>/)[1]);
  assert.match(context, /Temperature.*No earlier reading available/);
  assert.doesNotMatch(context, /null|undefined|NaN/);
});
