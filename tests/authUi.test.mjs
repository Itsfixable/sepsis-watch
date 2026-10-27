import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const routeCode = ts.transpileModule(readFileSync(new URL("../src/lib/auth/routeAccess.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const routeModule = { exports: {} };
new Function("module", "exports", routeCode)(routeModule, routeModule.exports);
function form(configured) {
  const source = readFileSync(new URL("../src/components/AuthForm.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const compiled = { exports: {} };
  const localRequire = name => {
    if (name.endsWith(".css")) return {};
    if (name === "@/lib/supabase/config") return { hasSupabaseConfig: () => configured };
    if (name === "@/lib/supabase/browser") return { getSupabaseBrowserClient: () => { throw new Error("No network in rendering tests"); } };
    if (name === "@/lib/auth/routeAccess") return routeModule.exports;
    return require(name);
  };
  new Function("require", "module", "exports", code)(localRequire, compiled, compiled.exports);
  return (props) => renderToStaticMarkup(React.createElement(compiled.exports.AuthForm, props));
}

test("unconfigured login explains availability without accepting unusable credentials", () => {
  const html = form(false)({ mode: "login" });
  assert.match(html, /role="status"/);
  assert.match(html, /href="\/about"/);
  assert.doesNotMatch(html, /<input/);
});

test("configured signup masks both passwords and exposes email autocomplete and requirements", () => {
  const html = form(true)({ mode: "signup" });
  assert.equal((html.match(/type="password"/g) || []).length, 2);
  assert.match(html, /type="email"/);
  assert.match(html, /autoComplete="email"/);
  assert.match(html, /minLength="12"/);
  assert.match(html, /aria-describedby="password-help"/);
  assert.match(html, /Supabase/);
});

test("recovery requests collect only email and the update screen collects only new passwords", () => {
  const render = form(true);
  const request = render({ mode: "forgot" });
  assert.match(request, /type="email"/);
  assert.doesNotMatch(request, /type="password"/);
  const update = render({ mode: "update" });
  assert.equal((update.match(/type="password"/g) || []).length, 2);
  assert.doesNotMatch(update, /type="email"/);
});

test("expired email link has an accessible recovery error and no token echoed into the page", () => {
  const html = form(true)({ mode: "login", linkError: true });
  assert.match(html, /role="alert"/);
  assert.match(html, /href="\/forgot-password"/);
  assert.doesNotMatch(html, /token_hash|access_token/);
});

test("login and signup expose guest navigation even when authentication is unconfigured", () => {
  for (const configured of [true, false]) {
    for (const mode of ["login", "signup"]) {
      const html = form(configured)({ mode, nextPath: "/research?record=a#inputs" });
      assert.match(html, /<a[^>]+href="\/research\?record=a#inputs"[^>]*>Continue as guest<\/a>/);
      assert.match(html, /No account or email verification required/);
    }
  }
});

test("guest links never send visitors to password updates or external destinations", () => {
  for (const nextPath of ["/update-password", "//evil.test", "/api/readings"]) {
    const html = form(true)({ mode: "login", nextPath });
    assert.match(html, /<a[^>]+href="\/replay"[^>]*>Continue as guest<\/a>/);
  }
});
