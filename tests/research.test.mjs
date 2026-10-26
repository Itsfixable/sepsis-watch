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
const inputDomain = load(path.join(root, "src/lib/researchInputs.ts"));

test("input walkthrough finds scored temperature examples without treating future readings as current", () => {
  assert.equal(typeof inputDomain.researchInputExamples, "function");
  const hours = [
    { hour: 0, heartRate: null, respRate: null, spo2: null, tempC: null, risk: null },
    { hour: 1, heartRate: 80, respRate: null, spo2: null, tempC: null, risk: .01 },
    { hour: 2, heartRate: 81, respRate: null, spo2: null, tempC: 36.17, risk: .02 },
    { hour: 3, heartRate: 82, respRate: null, spo2: null, tempC: null, risk: .03 },
  ];
  const medians = [80, 7, 0, 17, 7, 0, 36.94, 7, 0, 96, 7, 0];
  assert.deepEqual(inputDomain.researchInputExamples(hours, medians).map(s => [s.source, s.index]),
    [["median", 1], ["current", 2], ["earlier", 3]]);
  assert.equal(inputDomain.researchInputTrace(hours.slice(0, 2), medians).rows[2].value, 36.94);
});

test("walkthrough omits absent example types and unscored rows", () => {
  assert.equal(typeof inputDomain.researchInputExamples, "function");
  const medians = Array(12).fill(37);
  assert.deepEqual(inputDomain.researchInputExamples([], medians), []);
  const rows = [0, 1].map(hour => ({ hour, heartRate: 80, respRate: 17, spo2: 96, tempC: 37, risk: hour === 0 ? null : .01 }));
  assert.deepEqual(inputDomain.researchInputExamples(rows, medians).map(s => [s.source, s.index]), [["current", 1]]);
});

test("record view labels walkthrough as retrospective and selects the matching hour", () => {
  const html = renderToStaticMarkup(React.createElement(components.ResearchRecordView, {
    record, index: 3, onIndexChange() {}, threshold: .2, imputation: Array(12).fill(37),
  }));
  assert.match(words(html), /Temperature walkthrough/);
  assert.match(words(html), /Retrospective shortcuts/);
  const selectedButton = (html.match(/<button\b[^]*?<\/button>/g) ?? []).find(button => button.includes('aria-current="step"'));
  assert.match(words(selectedButton ?? ""), /Earlier reading Hour 3/);
  assert.match(words(html), /Hour 3: no current temperature.*37 °C.*hour 2/i);
});
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

test("research jump link has a focusable target and error summary precedes results", () => {
  const page = load(path.join(root, "src/app/research/page.tsx"));
  const html = renderToStaticMarkup(React.createElement(page.default));
  assert.match(html, /href="#records-title"/);
  assert.match(html, /id="records-title"[^>]*tabindex="-1"/);
  assert.ok(html.indexOf("This threshold generates too many false alerts") < html.indexOf("<table"));
  assert.match(words(html), /Scroll sideways/);
  assert.match(words(html), /What the model used/);
  assert.doesNotMatch(words(html), /Model input details unavailable/);
});

test("a completed reference window with too few readings is not still building", () => {
  const sparse = { ...record, hours: Array.from({length: 13}, (_, hour) => ({ ...record.hours[0], hour, tempC: hour === 12 ? 37 : null })) };
  const html = words(renderToStaticMarkup(React.createElement(components.ResearchRecordView, {record:sparse, index:12, threshold:.2, onIndexChange:()=>{}})));
  assert.ok(html.includes("Not enough initial readings to compare."));
});

test("unreachable validation target never becomes zero misses or zero false alerts", () => {
  const missing = { ...cohort, threshold:null, detectedStays:null, missedStays:null, falseAlarmStays:null, falsePositiveHours:null, falsePositiveHoursPer100:null };
  const bundle = parse(modelText, { ...report, threshold:null, validation:missing, internalTest:missing, externalTest:missing });
  const original = data.loadResearchBundle;
  try {
    data.loadResearchBundle = () => bundle;
    const page = load(path.join(root, "src/app/research/page.tsx"));
    const html = words(renderToStaticMarkup(React.createElement(page.default)));
    assert.ok(html.includes("No threshold met the validation target."));
    assert.ok(html.includes("Threshold-dependent outcomes were not evaluated"));
    assert.ok(!html.includes("0 septic stays were missed"));
    assert.ok(!html.includes("0.0%"));
    assert.ok(!html.includes("This threshold generates too many false alerts"));
  } finally { data.loadResearchBundle = original; }
});

test("exact observations preserve original fractional measurements", () => {
  const fractional = { ...record, hours:[{ ...record.hours[0], tempC:36.17, heartRate:82.25 }] };
  const html = renderToStaticMarkup(React.createElement(components.ResearchRecordView,{record:fractional,index:0,threshold:.2,onIndexChange:()=>{}}));
  const table = html.match(/<tbody>([\s\S]*?)<\/tbody>/)[1];
  assert.ok(table.includes("36.17"));
  assert.ok(table.includes("82.25"));
});

// These catch changed defaults, clipped scores, future-data leakage and falsy-zero navigation.
test("full scale stays zero to one even when all revealed scores are small", () => {
  assert.equal(typeof domain.researchChartScale, "function");
  assert.deepEqual(domain.researchChartScale([{risk:.009}], .01, false), {
    domain:[0,1], ticks:[0,.2,.4,.6,.8,1],
  });
});

test("zoom includes revealed scores and the threshold with a visible zero origin", () => {
  assert.equal(typeof domain.researchChartScale, "function");
  assert.deepEqual(domain.researchChartScale([{risk:.009},{risk:null},{risk:.011}], .01, true), {
    domain:[0,.02], ticks:[0,.004,.008,.012,.016,.02],
  });
  assert.deepEqual(domain.researchChartScale([{risk:null}], null, true).domain,[0,.02]);
  assert.deepEqual(domain.researchChartScale([{risk:0}], .2, true).domain,[0,.24]);
  assert.deepEqual(domain.researchChartScale([{risk:1}], .01, true).domain,[0,1]);
  assert.deepEqual(domain.researchChartScale([{risk:.999}], .01, true).domain,[0,1]);
});

test("unrevealed outliers cannot change a zoomed research chart", () => {
  assert.equal(typeof domain.researchChartScale, "function");
  const hours=[{...record.hours[0],risk:null},{...record.hours[1],risk:.009},{...record.hours[2],risk:.99}];
  const early=domain.researchSnapshot({...record,hours},1);
  assert.deepEqual(domain.researchChartScale(early.visible,.01,true).domain,[0,.02]);
  assert.equal(early.visible[0].risk,null);
});

test("first-score navigation includes a real zero score and handles absent scores", () => {
  assert.equal(typeof domain.firstResearchScoreIndex, "function");
  assert.equal(domain.firstResearchScoreIndex([{risk:null},{risk:0},{risk:.2}]),1);
  assert.equal(domain.firstResearchScoreIndex([{risk:.1}]),0);
  assert.equal(domain.firstResearchScoreIndex([{risk:null}]),null);
  assert.equal(domain.firstResearchScoreIndex([]),null);
});

test("research controls expose full-scale default and an explicit retrospective shortcut", () => {
  const html=renderToStaticMarkup(React.createElement(components.ResearchExplorer,{records:examples.records,threshold:.01}));
  assert.match(html,/<button[^>]*aria-pressed="true"[^>]*>Full scale<\/button>/);
  assert.match(html,/<button[^>]*aria-pressed="false"[^>]*>Zoomed scale<\/button>/);
  assert.match(words(html),/Full scale: 0\.000–1\.000/);
  assert.match(words(html),/Jump to first available score/);
  assert.match(words(html),/Retrospective navigation/);
  assert.match(words(html),/Hour 0 of 8/);
});

test("a record without scores disables the shortcut without hiding missingness", () => {
  const emptyScores={...record,hours:record.hours.map(row=>({...row,risk:null}))};
  const html=renderToStaticMarkup(React.createElement(components.ResearchExplorer,{records:[emptyScores],threshold:null}));
  assert.match(html,/<button[^>]*disabled=""[^>]*>Jump to first available score<\/button>/);
  assert.match(words(html),/No score/);
});

const medians = [80,0,0,18,0,0,37,0,0,97,0,0];
const emptyHour = hour => ({hour,heartRate:null,respRate:null,tempC:null,spo2:null,risk:null});
test("input history marks the exact earlier source through the six-hour boundary", () => {
  assert.equal(typeof inputDomain.researchInputHistory, "function");
  const hours = Array.from({length:9}, (_, hour) => ({...emptyHour(hour), heartRate:80, tempC:hour === 0 ? 36.17 : hour === 8 ? 40 : null, risk:.01}));
  const atSix = inputDomain.researchInputHistory(hours.slice(0,7), medians, "tempC", true);
  assert.equal(atSix.valueUsed, 36.17);
  assert.deepEqual(atSix.history.filter(h=>h.usedByModel).map(h=>h.hour), [0]);
  assert.equal(atSix.row.age, 6);
  const atSeven = inputDomain.researchInputHistory(hours.slice(0,8), medians, "tempC", true);
  assert.equal(atSeven.row.source, "median");
  assert.equal(atSeven.valueUsed, 37);
  assert.equal(atSeven.history[0].expired, true);
  assert.equal(atSeven.history.some(h=>h.usedByModel), false);
  assert.equal(atSeven.history.at(-1).hour, 7);
  assert.equal(atSeven.history.some(h=>h.value === 40), false);
});
test("input history distinguishes excluded values and does not invent used inputs when no score exists", () => {
  assert.equal(typeof inputDomain.researchInputHistory, "function");
  const hours = [{...emptyHour(0), tempC:36.17}, {...emptyHour(1),tempC:99}];
  const result = inputDomain.researchInputHistory(hours, medians, "tempC", false);
  assert.equal(result.valueUsed, null);
  assert.equal(result.history[1].excluded, true);
  assert.equal(result.history[1].value, null);
  assert.equal(result.history.some(h=>h.usedByModel), false);
  assert.equal(inputDomain.researchInputHistory([], medians, "tempC", false), null);
});
test("visual inspector defaults to temperature and exposes source and history as text", () => {
  const sample={...record,hours:[{...emptyHour(0),tempC:36.17,heartRate:80,risk:.01},{...emptyHour(1),heartRate:82,risk:.02}]};
  const html=renderToStaticMarkup(React.createElement(components.ResearchRecordView,{record:sample,index:1,imputation:medians,threshold:.01,onIndexChange:()=>{}}));
  assert.match(html, /<input[^>]*type="radio"[^>]*checked=""[^>]*value="tempC"/);
  assert.match(html, /aria-label="Temperature measurement history"/);
  assert.match(words(html), /Used by model/);
  assert.match(words(html), /Earlier reading.*36\.17.*1 h old/);
  assert.match(html, /<summary>All four input sources<\/summary>/);
});
test("input trace distinguishes current, earlier and training-median values", () => {
  assert.equal(typeof inputDomain.researchInputTrace,"function");
  const trace=inputDomain.researchInputTrace([{...emptyHour(0),heartRate:82,tempC:36.17},{...emptyHour(1),heartRate:90}],medians);
  assert.equal(trace.scorable,true);
  assert.deepEqual(trace.features,[90,0,1,18,7,0,36.17,1,0,97,7,0]);
  assert.deepEqual(trace.rows.map(r=>r.source),["current","median","earlier","median"]);
  assert.equal(trace.rows[2].current,null);
  assert.equal(trace.rows[2].observedHour,0);
});
test("input trace expires at seven hours and never borrows future observations", () => {
  assert.equal(typeof inputDomain.researchInputTrace,"function");
  const hours=Array.from({length:9},(_,i)=>({...emptyHour(i),tempC:i===0?36.17:i===8?40:null}));
  assert.equal(inputDomain.researchInputTrace(hours.slice(0,7),medians).rows[2].source,"earlier");
  const expired=inputDomain.researchInputTrace(hours.slice(0,8),medians);
  assert.equal(expired.scorable,false);
  assert.deepEqual(expired.features,[80,7,0,18,7,0,37,7,0,97,7,0]);
  assert.equal(expired.rows[2].observedHour,0);
  assert.equal(expired.rows[2].age,7);
  assert.equal(inputDomain.researchInputTrace(hours.slice(0,1),medians).rows[2].value,36.17);
});
test("input trace rejects invalid readings and missing preprocessing metadata", () => {
  assert.equal(typeof inputDomain.researchInputTrace,"function");
  const trace=inputDomain.researchInputTrace([{...emptyHour(0),heartRate:0,respRate:Infinity,tempC:46,spo2:49}],medians);
  assert.equal(trace.scorable,false);
  assert.ok(trace.rows.every(r=>r.current===null && r.source==="median"));
  assert.throws(()=>inputDomain.researchInputTrace([emptyHour(0)],[]),/imputation/i);
  assert.equal(inputDomain.researchInputTrace([],medians).scorable,false);
});
test("score display rounds finite values without turning missing values into zero", () => {
  assert.equal(typeof domain.formatResearchScore,"function");
  for(const [input,want] of [[.015544132478057495,"0.016"],[0,"0.000"],[1,"1.000"],[null,"—"],[undefined,"—"],[NaN,"—"],[Infinity,"—"]]) assert.equal(domain.formatResearchScore(input),want);
});
test("research view identifies model inputs and preserves exact scores", () => {
  const sample={...record,hours:[{...emptyHour(0),heartRate:82,risk:.015544132478057495}]};
  const html=renderToStaticMarkup(React.createElement(components.ResearchRecordView,{record:sample,index:0,imputation:medians,threshold:.01,onIndexChange:()=>{}}));
  assert.match(words(html),/What the model used/);
  assert.match(words(html),/Training-set median/);
  assert.match(html,/<strong>0\.016<\/strong>/);
  assert.match(html,/0\.015544132478057495/);
  assert.match(words(html),/Dashed line: evaluation threshold 0\.010/);
});
test("unscorable input display does not claim median values were used for a score", () => {
  const sample={...record,hours:[emptyHour(0)]};
  const html=words(renderToStaticMarkup(React.createElement(components.ResearchRecordView,{record:sample,index:0,imputation:medians,threshold:null,onIndexChange:()=>{}})));
  assert.match(html,/No inputs used for a published score/);
  assert.match(html,/No observation is highlighted because no score was published/);
  assert.doesNotMatch(html,/The highlighted observation supplies/);
  assert.doesNotMatch(html,/Dashed line: evaluation threshold/);
});
test("validated bundle supplies the actual training medians to the research page", () => {
  assert.deepEqual(parse().imputation,model.imputation);
});
