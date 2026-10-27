import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function load(relative) {
  const code = ts.transpileModule(readFileSync(new URL(relative, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const compiled = { exports: {} };
  new Function("require", "module", "exports", code)(
    (name) => name === "../lib/thresholds" ? load("../src/lib/thresholds.ts") : require(name), compiled, compiled.exports);
  return compiled.exports;
}

test("risk stroke switches to red at 0.60 independently of the observed score range", () => {
  assert.ok(existsSync(new URL("../src/components/RiskStroke.tsx", import.meta.url)), "Threshold-aligned stroke must exist");
  const { RiskStrokeDefinition } = load("../src/components/RiskStroke.tsx");
  const markup = renderToStaticMarkup(React.createElement("svg", null,
    React.createElement(RiskStrokeDefinition, { id: "test-risk", top: 20, height: 250 })));
  assert.match(markup, /gradientUnits="userSpaceOnUse"/);
  assert.match(markup, /y1="20"/);
  assert.match(markup, /y2="270"/);
  assert.match(markup, /offset="0.4" stop-color="#b8322a"/);
  assert.match(markup, /offset="0.4" stop-color="#226f5b"/);
});

test("risk stroke follows a resized plot", () => {
  assert.ok(existsSync(new URL("../src/components/RiskStroke.tsx", import.meta.url)), "Threshold-aligned stroke must exist");
  const { RiskStrokeDefinition } = load("../src/components/RiskStroke.tsx");
  const markup = renderToStaticMarkup(React.createElement("svg", null,
    React.createElement(RiskStrokeDefinition, { id: "small-risk", top: 16, height: 120 })));
  assert.match(markup, /y1="16"/);
  assert.match(markup, /y2="136"/);
  assert.match(markup, /offset="0.4" stop-color="#b8322a"/);
});
