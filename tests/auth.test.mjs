import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

// Compile the real TS modules; substitute only external auth/network boundaries.
const require = createRequire(import.meta.url);
const root = new URL("../src/", import.meta.url).pathname;
function load(name, mocks = {}) {
  const filename = path.join(root, name);
  const code = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  const localRequire = (id) => {
    if (id in mocks) return mocks[id];
    if (id.startsWith(".")) return load(path.relative(root, path.resolve(path.dirname(filename), `${id}.ts`)), mocks);
    return require(id);
  };
  new Function("require", "module", "exports", code)(localRequire, mod, mod.exports);
  return mod.exports;
}

test("return paths preserve internal deep links and reject redirects outside the app", () => {
  const { safeReturnPath } = load("lib/auth/routeAccess.ts");
  assert.equal(safeReturnPath("/research?record=a#inputs"), "/research?record=a#inputs");
  for (const value of [null, ["/replay", "/research"], "https://evil.test", "//evil.test", "/\\evil.test", "/%2f%2fevil.test", "javascript:alert(1)", "/login", "/auth/callback", "/api/readings", "/replay/../../login", "/replay\n"]) {
    assert.equal(safeReturnPath(value), "/replay", String(value));
  }
});

test("all interactive routes and descendants require an account", () => {
  const { isProtectedPath } = load("lib/auth/routeAccess.ts");
  for (const value of ["/monitor", "/replay", "/replay/classic", "/research", "/prototype", "/update-password"]) assert.equal(isProtectedPath(value), true);
  for (const value of ["/", "/about", "/login", "/signup", "/forgot-password", "/auth/callback", "/replays"]) assert.equal(isProtectedPath(value), false);
});

const { NextRequest } = require("next/server");
function proxyFor({ configured = true, user = null, error = null, throws = false, refresh = false } = {}) {
  return load("lib/supabase/proxy.ts", {
    "./config": { getSupabaseConfig: () => configured ? { url: "https://example.supabase.co", key: "sb_publishable_test" } : null },
    "@supabase/ssr": { createServerClient: (_url, _key, options) => ({ auth: { getUser: async () => {
      if (refresh) options.cookies.setAll([{ name: "sb-test-auth-token", value: "renewed", options: { path: "/", httpOnly: false, sameSite: "lax" } }]);
      if (throws) throw new Error("Auth unavailable");
      return { data: { user }, error };
    } } }) },
  }).updateSession;
}

test("unsigned and invalid sessions redirect without revealing protected content", async () => {
  for (const state of [{}, { user: { id: "forged" }, error: new Error("invalid") }, { throws: true }]) {
    const response = await proxyFor(state)(new NextRequest("https://site.test/research?record=a"));
    assert.equal(response.status, 307);
    assert.equal(new URL(response.headers.get("location")).pathname, "/login");
    assert.equal(new URL(response.headers.get("location")).searchParams.get("next"), "/research?record=a");
    assert.match(response.headers.get("cache-control"), /no-store/);
  }
});

test("missing configuration fails closed but leaves Overview and login available", async () => {
  const run = proxyFor({ configured: false });
  assert.equal((await run(new NextRequest("https://site.test/monitor"))).status, 307);
  assert.equal((await run(new NextRequest("https://site.test/about"))).status, 200);
  assert.equal((await run(new NextRequest("https://site.test/login"))).status, 200);
});

test("confirmed accounts pass and session refresh cookies survive both responses and redirects", async () => {
  for (const user of [null, { id: "real-user", email_confirmed_at: "2026-10-26T00:00:00Z", is_anonymous: false }]) {
    const response = await proxyFor({ user, refresh: true })(new NextRequest("https://site.test/replay"));
    assert.equal(response.status, user ? 200 : 307);
    assert.equal(response.cookies.get("sb-test-auth-token")?.value, "renewed");
    assert.match(response.headers.get("cache-control"), /no-store/);
  }
});

test("anonymous and unconfirmed accounts cannot enter the workspace", async () => {
  for (const user of [{ id: "anon", is_anonymous: true }, { id: "unconfirmed", email_confirmed_at: null }]) {
    assert.equal((await proxyFor({ user })(new NextRequest("https://site.test/replay"))).status, 307);
  }
});

test("auth callback exchanges the code and restricts the destination to an internal page", async () => {
  const { GET } = load("app/auth/callback/route.ts", {
    "../../../lib/supabase/config": { hasSupabaseConfig: () => true },
    "../../../lib/supabase/server": { getSupabaseServerClient: async () => ({ auth: { exchangeCodeForSession: async (code) => {
      assert.equal(code, "one-time-code");
      return { data: { session: {} }, error: null };
    } } }) },
  });
  for (const [next, expected] of [["/update-password", "/update-password"], ["https://evil.test", "/replay"]]) {
    const response = await GET(new Request("https://site.test/auth/callback?code=one-time-code&next=" + encodeURIComponent(next)));
    assert.equal(new URL(response.headers.get("location")).pathname, expected);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  }
});

test("missing or rejected auth codes lead to a recoverable login error", async () => {
  const { GET } = load("app/auth/callback/route.ts", {
    "../../../lib/supabase/config": { hasSupabaseConfig: () => true },
    "../../../lib/supabase/server": { getSupabaseServerClient: async () => ({ auth: { exchangeCodeForSession: async () => ({ error: new Error("Expired code") }) } }) },
  });
  for (const suffix of ["", "?code=expired", "?error=access_denied"]) {
    const response = await GET(new Request("https://site.test/auth/callback" + suffix));
    assert.equal(new URL(response.headers.get("location")).pathname, "/login");
    assert.equal(new URL(response.headers.get("location")).searchParams.get("error"), "link");
  }
});

test("page guard rejects unverified cookies even if proxy was bypassed", async () => {
  for (const user of [null, { id: "unconfirmed" }, { id: "valid", email_confirmed_at: "2026-10-26" }]) {
    const { requireUser } = load("lib/auth/requireUser.ts", {
      "server-only": {},
      "next/navigation": { redirect: (url) => { throw new Error("REDIRECT:" + url); } },
      "../supabase/config": { hasSupabaseConfig: () => true },
      "../supabase/server": { getSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) } }) },
    });
    if (user?.email_confirmed_at) await requireUser("/research");
    else await assert.rejects(requireUser("/research"), /REDIRECT:\/login\?next=%2Fresearch/);
  }
});

test("malformed auth configuration cannot crash public pages or unlock protected pages", async () => {
  const names = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const previous = names.map(name => process.env[name]);
  try {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    const { getSupabaseConfig } = load("lib/supabase/config.ts");
    for (const url of ["project-id", "ftp://example.test", "https://", "http://remote.test", "https://user:pass@example.test"]) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = url;
      assert.equal(getSupabaseConfig(), null, url);
      const { updateSession } = load("lib/supabase/proxy.ts");
      assert.equal((await updateSession(new NextRequest("https://site.test/about"))).status, 200);
      assert.equal((await updateSession(new NextRequest("https://site.test/replay"))).status, 307);
    }
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    assert.equal(getSupabaseConfig().url, "https://example.supabase.co");
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_secret_never_public";
    assert.equal(getSupabaseConfig(), null);
  } finally {
    names.forEach((name, index) => {
      if (previous[index] === undefined) delete process.env[name];
      else process.env[name] = previous[index];
    });
  }
});
