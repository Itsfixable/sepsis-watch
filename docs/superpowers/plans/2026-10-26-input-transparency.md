# Input Transparency Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. The user approved the evidence-first plan in chat with “ok lets go with this plan”.

**Goal:** Show which current, earlier or imputed values actually fed the research model, and demonstrate this engineering in the pitch.
**Architecture:** A pure TypeScript trace reconstructs the Python preprocessing on the revealed prefix using validated training medians. A dedicated semantic UI displays its provenance, never a causal or LLM explanation. The existing model outputs remain precomputed.
**Constraints:** Reuse research-controls and preserve prior uncommitted edits. No model/data/result changes, no new dependencies, no commit/push/deployment. Keep all medical and source qualifications. No invented usability evidence.

## Review focus
- Exactly six hours is eligible; seven hours is imputed. Future observations cannot influence earlier traces.
- Real zero is not missing; invalid/out-of-range vitals are unavailable.
- All four unavailable means no score, not four medians masquerading as patient readings.
- Value, age and current flag match the Python pipeline, including sentinel age 7.
- Source labels, current missingness and twelve pre-scaling inputs remain truthful on mobile.

## Task 1: Trace and display
- [x] Add failing tests for sources, expiry, no-score, future exclusion, rounding, exact-value retention and model-median wiring.
- [x] Implement src/lib/researchInputs.ts with researchInputTrace(visible, imputation), returning rows, scorable and twelve pre-scaling features. Pass validated imputation from researchData through the Research page. No defaults invented for absent metadata.
- [x] Add ResearchInputs.tsx with current observation, prepared model value, source and observation age. At unscorable hours explicitly show no inputs used. Offer exact twelve inputs in disclosure.
- [x] Round hover scores and label the evaluation threshold. Preserve exact observations and existing navigation.
- [x] Verify full Node suite, Python suite, direct Python/TS parity on hand fixtures and both published records, lint/build, keyboard, mobile and actual browser behavior.

## Task 2: Evidence and pitch
- [x] Prepare a genuine first-time-user test sheet with no fabricated results.
- [x] Revise ten-slide v17 deck and script around observed changes and input trust. Retain existing section order, real error metrics and AI disclosure.
- [x] Capture finished UI, render all slides, validate deck and count script. Include an understanding/rehearsal checklist.
- [x] Obtain independent code review and fix important findings with tests. Handoff local preview and artifacts. User testing, recording and production submission remain human/external steps until evidence and authorization are supplied.
