import assert from "node:assert/strict";
import { after, afterEach, beforeEach, test } from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const compiled = mkdtempSync(path.join(tmpdir(), "sepsiswatch-api-tests-"));
after(() => rmSync(compiled, { recursive: true, force: true }));
for (const [name, relative] of [["route", "app/api/readings/route"], ...["readingsStore", "validateReading", "monitorMode"].map((name) => [name, `lib/${name}`])]) {
  const file = new URL(`../src/${relative}.ts`, import.meta.url);
  if (existsSync(file)) writeFileSync(path.join(compiled, `${name}.js`), ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText.replaceAll('require("@/lib/', 'require("./'));
}
const require = createRequire(import.meta.url);
const api = require(path.join(compiled, "route.js"));
const store = require(path.join(compiled, "readingsStore.js"));
const envKeys = ["NODE_ENV", "SEPSISWATCH_LOCAL_API", "VERCEL"];
let saved;
beforeEach(() => {
  saved = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  for (const key of envKeys) delete process.env[key];
});
afterEach(() => {
  for (const key of envKeys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});
const reading = { timestamp: "2026-10-25T12:00:00Z", risk: 0.2, heartRate: 80, respRate: 16, tempC: null, spo2: 98 };
const request = (body) => new Request("http://localhost/api/readings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("disabled API cannot add readings or expose existing local observations", async () => {
  store.addReading(reading);
  const count = store.getReadings().length;
  const response = await api.POST(request({ ...reading, timestamp: "2026-10-25T13:00:00Z" }));
  assert.equal(response.status, 403);
  assert.equal(store.getReadings().length, count);
  const get = await api.GET();
  assert.equal(get.status, 403);
  assert.equal(get.headers.get("cache-control"), "no-store");
  assert.equal((await get.json()).readings, undefined);
});

test("production and Vercel refuse API access even with the local flag enabled", async () => {
  process.env.SEPSISWATCH_LOCAL_API = "1";
  for (const [nodeEnv, vercel] of [["production", undefined], ["development", "1"]]) {
    process.env.NODE_ENV = nodeEnv;
    if (vercel) process.env.VERCEL = vercel;
    else delete process.env.VERCEL;
    assert.equal((await api.POST(request(reading))).status, 403);
    assert.equal((await api.GET()).status, 403);
  }
});

test("enabled local API validates, stores, replaces and retrieves synthetic observations", async () => {
  process.env.NODE_ENV = "development";
  process.env.SEPSISWATCH_LOCAL_API = "1";
  const value = { ...reading, timestamp: "2026-10-25T14:00:00Z" };
  assert.equal((await api.POST(request(value))).status, 201);
  const replacement = await api.POST(request({ ...value, heartRate: 90 }));
  assert.equal(replacement.status, 200);
  assert.equal((await replacement.json()).replaced, true);
  assert.equal((await api.POST(request({ ...value, risk: 9 }))).status, 400);
  const malformed = new Request("http://localhost/api/readings", { method: "POST", body: "{" });
  assert.equal((await api.POST(malformed)).status, 400);
  const get = await api.GET();
  assert.equal(get.status, 200);
  const rows = (await get.json()).readings;
  assert.equal(rows.find((r) => r.timestamp === "2026-10-25T14:00:00.000Z").heartRate, 90);
});
