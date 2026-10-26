# Research Scoring Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline with test-driven-development and a fresh whole-branch reviewer. User approved proceeding without additional planning checkpoints.

**Goal:** Publish a reproducible four-vital research model and a clearly separated retrospective research view.

**Architecture:** Offline Python training produces versioned JSON coefficients, evaluation and two held-out examples. Next.js validates and renders these artifacts; no runtime inference API, uploads or Gemini calls.

**Tech Stack:** Existing Next.js/React/TypeScript/CSS Modules; isolated Python, NumPy and scikit-learn.

**Spec:** `docs/superpowers/specs/2026-10-26-research-scoring-design.md`

## Global Constraints

- Preserve demo records, scores, thresholds and API access controls.
- Four vitals only; causal six-hour carry with availability/age features; no score with no recent valid values.
- A: patient-level 70/15/15 split, seed 2026. B: untouched external test. Training-only preprocessing.
- Targets and exclusions exactly as specified; threshold selected only from validation at 80% event detection.
- Gemini remains inactive; no paid services or patient data submissions.
- Report poor performance, coverage and both source-license references honestly.

## Review Focus

- Left-censored/non-monotonic targets and short stays must never create fabricated future outcomes (Task 1).
- Unscored positive stays remain missed; unscored negatives are not silently counted as successful rejections (Task 1).
- Future-row changes cannot alter earlier features/scores/reference summaries (Tasks 1 and 2).
- Artifact schema/model mismatch must fail closed without publishing plausible-looking wrong scores (Task 2).
- Mobile/keyboard users can inspect exact observations and see missingness without relying on chart colors (Task 2).

## Task 1: Reproducible training and artifacts

Files: `scripts/research/{data,model,evaluation,train}.py`, `scripts/research/requirements.txt`, `tests/test_research.py`, `data/research/{model,report,examples}.json`, `data/research/README.md`, `.gitignore`.

Interfaces: `eligible_target(labels, icu_hours) -> (targets, onset, exclusion)`; `features(vitals) -> (matrix, scorable)` with 12 columns; `fit_model(X,y) -> (pipeline, JSON model)`; `predict_export(model,X) -> scores`; `evaluate(patients, scores, threshold, prevalence) -> report`; `select_threshold(validation, scores) -> float | None`. Artifacts share schema version 1 and model SHA-256.

- [ ] Write tests with hand-derived labels (first positive row 3 => onset 9, positives 3–8); no-onset 10-hour stay => eligible hours 0–3; left-positive exclusion; causal age 6 accepted, 7 unavailable; invalid vital ranges; leakage invariance; duplicate partition rejection; training-only imputation; coefficient parity; missed unscorable cases; threshold selection and deterministic example choice.
- [ ] Run `python -m unittest discover -s tests -p 'test_research.py'`; expect missing-feature failures.
- [ ] Implement functions and pinned environment; obtain official dataset without bypassing restrictions; train once with declared split and no test tuning. Export sanitized four-vital examples, all cohort counts, reproducibility hashes, reliability bins, baseline comparisons and threshold metrics.
- [ ] Run full Python suite plus `npm test`; expect all pass. Re-run training and compare model/report/example hashes.
- [ ] Commit `Research model` after verification.

## Task 2: Research view

Files: `src/lib/research.ts`, `src/app/research/page.tsx`, `src/components/ResearchExplorer.tsx`, `src/components/ResearchExplorer.module.css`, `tests/research.test.mjs`; modify Overview/Timelines entry links and README.

Interfaces: `parseResearchBundle(model, report, examples) -> ResearchBundle` checks schemas/hash/finite values/chronology; `researchSnapshot(example,index) -> visible prefix/current/observation summary` reuses existing reference logic. Static page loads validated artifacts; client explorer receives serializable examples only.

- [ ] Write failing tests for invalid artifacts, stale/no-score display, selected-hour synchronization, future masking, honest source/score labels and no outcome leakage in summaries. Render real components using the existing test harness.
- [ ] Run `node --test tests/research.test.mjs`; expect feature-missing failures.
- [ ] Implement a matching green/cream research view with cohort table, limitations, expandable methods, two example selectors, accessible range control, exact values and observation summary. No model probability percentage, synthetic thresholds, AI badge or live patient entry.
- [ ] Update source-specific README/Overview claims so old “no trained model anywhere” language does not contradict the separate research experiment. Preserve synthetic demos' labels.
- [ ] Run full tests, lint, build; inspect all routes at desktop/phone widths and keyboard controls. Commit `Research view`.

## Task 3: Review and release

- [ ] Prepare whole-branch review package; fresh reviewer checks implementation against spec and Review Focus. Fix important findings with failing regression tests first; rerun full suites/build.
- [ ] Push `research-scoring`; create and attach PR with actual test results, model limits and deferred Gemini explicitly stated.
- [ ] Verify required checks and Vercel preview; merge only the reviewed SHA. Verify production deployment and `/research` plus existing routes. Report actual URLs and remaining limitations.

## Self-review

The model/report/example schema is the shared boundary between Tasks 1 and 2. Task 2 cannot invent or rename report fields without updating validation and tests. No test-set optimization or provider activation is included. Existing dependency audit findings must be assessed before release; do not force-upgrade packages blindly.
