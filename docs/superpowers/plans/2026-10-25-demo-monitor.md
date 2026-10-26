# Demo Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a self-contained synthetic Monitor and preserve an explicitly enabled local API demonstration.

**Architecture:** The Monitor server page selects demo or local mode. A client-only session reveals bundled synthetic observations through a pure reducer; it never contacts the readings API. Both API handlers enforce the same server-side local-mode policy before reading or writing data.

**Tech Stack:** Existing Next.js 16, React 19, TypeScript, CSS Modules, Recharts and Node tests; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-25-demo-monitor-design.md`

## Global Constraints

- First 24 observations immediately; one additional observation every three seconds.
- Restart returns to the initial observations and pauses; reaching the end stops playback.
- Synthetic records only; preserve missing readings and scores; no future observations in rendered charts/tables.
- Each browser session is independent, with no storage or live API fetches.
- Keep existing layout and Timelines behavior; no threshold, model, hardware, or dependency changes.
- Explicit local-only API switch, default off; never enabled on Vercel.
- Use a new `demo-monitor` branch and separate PR; no production merge in this task.

## Review Focus

- Empty or short records: stable empty/completed state, no timer loop or invalid indexing.
- A queued timer after Pause/Restart: must not advance a paused session.
- Vercel/production accidentally configured for local mode: both API methods remain disabled.
- Missing current vital/score: no stale value described as current, no false green status.
- Patient switching, navigation and multiple tabs: state resets without timers leaking between records or sessions.

### Task 1: Session model and local API boundary

**Files:** Create `src/lib/demoMonitor.ts`, `src/lib/monitorMode.ts`, `tests/demoMonitor.test.mjs`, `tests/readingsApi.test.mjs`; modify `src/app/api/readings/route.ts`.

**Interfaces:**
- `demoRecords(records: ReplayRecord[]): ReplayRecord[]`: synthetic, nonempty records only.
- `initialDemoSession(length: number, playing?: boolean): DemoSession`: `{ count: number; playing: boolean }`, at most 24 initial rows.
- `demoSessionReducer(state: DemoSession, action: DemoAction): DemoSession`: actions `tick`, `toggle`, `restart`, each carrying `length`.
- `demoSnapshot(hours: ReplayHour[], count: number)`: bounded revealed rows, current row, and current-only tile values with separately labeled last-measurement notes.
- `localReadingsEnabled(env = process.env): boolean`: true only when `SEPSISWATCH_LOCAL_API=1`, `NODE_ENV=development`, and no Vercel marker is present.

- [ ] Write tests for initial count, bounded progression, pause/restart/end, short/empty records, patient/source filtering, current missing values, and no future rows. Assert literal outcomes (24 initially; first tick 25; paused tick unchanged; final count 48 and playing false).
- [ ] Write API tests against actual GET/POST handlers: default/production/Vercel reject with 403 and do not mutate/expose stored readings; local mode accepts valid input and retains validation/replacement behavior.
- [ ] Run `npm test`; observe failures for missing behavior.
- [ ] Implement the helpers and gate both handlers before parsing/accessing the store. Use `Cache-Control: no-store` on disabled responses.
- [ ] Run `npm test`; expect all tests passing. Commit as `Add simulation`.

### Task 2: Monitor UI, local workflow, and handoff

**Files:** Create `src/components/DemoMonitor.tsx`, `src/components/DemoMonitor.module.css`, `tests/demoMonitorUi.test.mjs`; modify `src/app/monitor/page.tsx`, `src/components/VitalTiles.tsx`, `src/components/StatusLight.tsx`, `src/components/RiskChart.tsx`, `src/components/DataTable.tsx`, `src/components/LiveMonitor.tsx`, `README.md`, `docs/API.md`, `scripts/demo_pi.py`.

**Interfaces:** Consume Task 1 helpers. `DemoMonitor({ records: ReplayRecord[] })` filters again defensively and keys its session by patient. Existing shared components gain optional demo-copy props, keeping their defaults unchanged. Current missing vital notes are rendered even when the value is null.

- [ ] Write server-render tests using actual React components: demo notice, hour 23 of 47, 24 visible rows only, missing-current value and age, null score, short/empty/non-synthetic records, and patient labeling. Run `npm test`; expect missing-component failures.
- [ ] Implement DemoMonitor with reducer state, a cleaned-up 3000ms interval, patient selection, Pause/Resume/Restart, and a terminal completed state. Current hour, tiles, chart, score and table derive from the same snapshot. Use no date-based clock, fetch, or browser storage.
- [ ] Add demo-only illustrative score/level labels and safety text to shared components. Avoid repeated automatic screen-reader score announcements in demo mode. Use 44px control targets, visible focus and responsive wrapping.
- [ ] Select demo/local mode in the server page, filtering synthetic data before passing it to the browser. Keep local mode visibly labeled as a synthetic API demonstration.
- [ ] Document `SEPSISWATCH_LOCAL_API=1 npm run dev -- --hostname 127.0.0.1`, the corrected sender command, disabled production ingestion and transient local storage. Restrict unrelated copy edits to the follow-up wording task.
- [ ] Run full tests, targeted ESLint, `npm run build`, and `git diff --check`; expect green results.
- [ ] Browser-check desktop and 390px mobile: pause, restart, switching, end-of-record, independent tabs, keyboard access, no overflow, missing-value state. Smoke-test production GET/POST rejection and the enabled local Python/API pipeline.
- [ ] Commit as `Build monitor`. Obtain one independent whole-branch review, address important findings with regression tests, then push and open `Demo monitor` PR. Attach it to this chat; do not merge.
