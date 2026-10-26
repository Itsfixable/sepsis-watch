# Research Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make small research scores inspectable and demonstrate the engineering choices in the pitch.
**Architecture:** Pure scale and shortcut helpers in research.ts feed accessible client controls. Preserve the full-scale default, model artifacts and existing missingness behavior. Revise the existing local deck after browser verification.
**Tech Stack:** TypeScript, React, Next.js, Recharts, CSS Modules, Node tests, Artifact Tool.
**Spec:** docs/superpowers/specs/2026-10-26-research-controls-design.md

## Global Constraints
- No model, threshold, result, data or production changes.
- Default full scale 0–1; zero-anchored zoom includes only revealed scores plus threshold, and never clips values.
- No new dependencies. Retain research disclosures and missing-score gaps.
- User approved direct implementation. Work locally; do not push or deploy.

## Review Focus
- Future outliers must not affect earlier zoom ranges.
- Missing, zero, and maximum scores must retain correct range and navigation.
- Shortcuts with no score must be disabled; hour zero remains reachable.
- Switching records must reset selected hour and full-scale view.
- Mobile controls must fit and support keyboard focus without changing data.

### Task 1: Research controls
**Files:** src/lib/research.ts, src/components/ResearchExplorer.tsx, src/components/ResearchExplorer.module.css, tests/research.test.mjs
**Interfaces:** researchChartScale(visible: ReplayHour[], threshold: number | null, zoomed: boolean) returns {domain: [number, number], ticks: number[]}; firstResearchScoreIndex(hours: ReplayHour[]) returns number | null.
- [x] Add failing tests: full range [0,1], zoom [.009,.011] at threshold .01 gives [0,.02], missing-only gives [0,.02], score 1 remains in [0,1], future outlier excluded through researchSnapshot, zero score recognized, no score returns null. Render defaults and disabled shortcut.
- [x] Run node --test tests/research.test.mjs and observe expected missing-feature failures.
- [x] Implement helpers; zoom rounds padded maximum upward to .01, minimum .02, cap 1. Use five equal intervals with explicit decimal labels. Add native buttons with aria-pressed, scale status and retrospective shortcut description.
- [x] Run npm test, npm run lint, npm run build; browser-check both modes, shortcut, Previous back to h0, gaps, reset, mobile and keyboard.
- [x] Confirm git diff has no data/research or model-training changes. Leave changes local for user review.

### Task 2: Deck and script
**Files:** separate pitch output directory, new v16 PPTX and recording script.
**Interfaces:** Actual completed controls and screenshots from Task 1; existing v15 local deck and notes.
- [x] Revise narration to show zoom and explain median robustness, record-level separation, training-only preprocessing. Keep accurate results and safety context.
- [x] Update affected slides and speaker notes, preserve structure and styling. Save a new version, not overwrite v15.
- [x] Render all slides, inspect fit and citations, run presentation finalizer, count spoken words and include recording directions.
- [x] Obtain one fresh review of the code changes, address important findings with tests, then hand off local preview and artifacts without deploying.
