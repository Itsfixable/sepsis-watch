# Context Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the three approved walkthrough findings without changing scores or data.

**Architecture:** Add a historical-context formatter using the existing snapshot's last value, age, and reference. Render that context separately from current findings and share it with accessible/copy summaries. Update Monitor labels and Overview prose in existing components.

**Tech Stack:** Next.js 16.3.8, React 19, TypeScript, CSS modules, Node test runner.

**Spec:** docs/superpowers/specs/2026-10-25-context-clarity-design.md

## Global Constraints

- No changes to synthetic data, scores, warning thresholds, timing, API access, or dependencies.
- Earlier values remain historical, with their hour and age; no inferred cadence or freshness window.
- Reset keeps the initial 24 observations and stays paused.
- Keep prototype and synthetic-data disclosures. Intended users are future users, not current medical-use authorization.
- Work on clarify-context in the separate publishing checkout; preserve pre-existing untracked AGENTS.md and CLAUDE.md.

## Review Focus

- No earlier measurement: show no earlier reading rather than a numeric placeholder.
- Insufficient reference: retain historical value/age without inventing a delta.
- Long gaps and future rows: retain actual age, never borrow future observations.
- Lower or unchanged historical reading: correct direction and percentage-point units.
- Phone widths and assistive text: historical context stays readable and agrees with copied summary.

### Task 1: Clarify the demo context

**Files:** src/lib/patientStory.ts; src/components/PatientStory.tsx; src/components/PatientStory.module.css; src/components/DemoMonitor.tsx; src/app/about/page.tsx; README.md; tests/patientStory.test.mjs; tests/demoMonitorUi.test.mjs.

**Interfaces:** Export earlierObservationContext(item, selectedHour): string | null using the snapshot observation type. Return null for current observations; otherwise describe last value, hour, age, reference delta when available, and no new reading. Consume it in the story note and copied/accessibility summaries. Existing reducers and snapshot current/delta fields are unchanged.

- [x] Add failing formatter and rendered-story tests. Assert A h35 contains 38.1 °C at h34, age 1h and +1.15 °C historical context against exact reference 36.95 °C, while current temperature and delta stay null. Cover absent history/reference, long gap, future exclusion, negative/zero delta and oxygen units.
- [x] Run npm test. Expected: new tests fail on missing helper/context; existing tests remain green.
- [x] Implement historical context, update Reset demo and its helper text, and update Overview purpose/audience with a CDC source link.
- [x] Run npm test. Expected: all tests pass. Run ESLint on touched source/tests, npm run build, git diff --check. Expected: success.
- [x] Verify /replay, /monitor and /about in browser, desktop and 390px phone width. Check reset pauses at h23 and historical context remains separate from current data.
- [ ] Commit as “Clarify context”; obtain fresh whole-branch review, address blockers with regression tests, then push and create “Clarify context” PR against main. Do not merge.
