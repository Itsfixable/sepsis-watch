# Guest Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax for tracking.

**Goal:** Let visitors explore without registration while preserving account protection.
**Architecture:** Public sample-data pages, a safe guest link on auth forms, and
confirmed-user guards only on password management. No anonymous Supabase session.
**Tech Stack:** Existing Next.js, React, TypeScript and Node test runner.
**Spec:** docs/superpowers/specs/2026-10-26-guest-access-design.md

## Global Constraints
- Keep email verification and production API restrictions unchanged.
- Preserve unrelated files. No new dependencies or credentials.
- Create PR; do not merge or deploy.

## Review Focus
- Auth unavailable: guest link and sample pages still work.
- Password-update return path: guest link falls back to /replay.
- Malicious return path: never navigate outside allowed workspace paths.
- Direct classic/prototype URLs: no leftover page guard.
- Signed-out visitor: password update still redirects, readings API still denies.

### Task 1: Guest access boundary and entry point
**Files:** src/lib/auth/routeAccess.ts, src/components/AuthForm.tsx,
src/components/AuthForm.module.css, the five workspace page.tsx files,
tests/auth.test.mjs, tests/authUi.test.mjs, docs/AUTH.md, README.md.
**Interfaces:** retain safeReturnPath and requireUser; add safeGuestReturnPath(value)
which accepts safe workspace paths but falls back to /replay for password updates.

- [x] Add regression tests: workspace routes return 200 for missing/invalid auth;
  /update-password still returns 307; guest form link works for configured and
  unconfigured forms and preserves /research?record=a#inputs; unsafe or account
  destinations fall back to /replay.
- [x] Run node --test tests/auth.test.mjs tests/authUi.test.mjs; observe failures.
- [x] Separate workspace paths from protected paths; remove guards on workspace
  pages only; render a styled guest link on login/signup. Update auth copy/docs.
- [x] Run npm test, npm run lint, npm run build, and git diff --check.
- [x] Smoke-test guest pages and /update-password plus /api/readings locally.
- [ ] Obtain whole-diff review, commit as Add guests, push and create PR.

## Execution record
User approved the design and explicitly requested implementation and PR.
Existing isolated worktree reused; baseline origin/main is 592b401.
Baseline 95 tests passed. Regression tests failed before implementation; the
complete suite now passes 99/99. Lint, standalone TypeScript and production build
passed. Local production HTTP checks: five workspace pages 200, password update
307 to login, readings API 403. Browser click from login with a Research return
path opened Research without a session or configured Supabase client.
Independent review found no functional blockers; a stale README statement was
corrected. Hosted email signup is not verified or fixed by this PR.
