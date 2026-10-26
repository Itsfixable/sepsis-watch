# Visual input-history inspector — local verification

## Scope

Research UI improvement only. No model, score, training, deployment, commit or PR changes. Existing uncommitted work preserved.

The focused inspector replaces the initially expanded four-vital source table. Native radio controls select a vital. Up to eight revealed hours show real measurements, gaps, excluded values, expired readings and the exact supplying observation. A separate output pane explains current, earlier, training-median and no-score states. Full input sources remain available in a disclosure.

## Verification, 2026-10-26

- Three new tests initially failed before implementation, then passed.
- No-score footer regression assertion failed before its copy fix, then passed.
- All 78 Node tests pass; production build and lint pass.
- Existing preprocessing parity: 123 Python/TypeScript input matches and score agreement within 1e-12. All 15 Python unit tests pass.
- Six-hour carry-forward boundary and seven-hour expiry covered in tests, including no future observations and no-score suppression.
- Independent focused review found no critical/important issues. Its minor no-score wording issue was corrected and regression-tested.
- Local production build inspected at http://127.0.0.1:3003/research.
- Arrow-key radio navigation verified for all four vitals. Temperature walkthrough resets another selected vital to temperature.
- Record 1 hour 0 correctly shows no published score and no highlighted observation.
- Record 1 hour 5 shows 36.17 C from hour 4, age 1, not measured now.
- Record 2 hour 2 shows 36.78 C from hour 1. At hour 12, its eight-hour history marks hour 5 expired and hour 10 as the supplying 36.67 C observation.
- At a 320-pixel viewport, measured page width remains 320, including expanded sources; selector, history tiles and stacked outcome visually inspected.
- Desktop 1280-pixel layout visually inspected. Temporary viewport override reset. No captured browser error logs.

Preview screenshot: /Users/kojitanaka/.codex/visualizations/2026/10/24/01a16e1d-cdf1-7973-b9b9-4ef4da57d8c2/input-history-preview.jpg

These checks establish the implementation behavior, not a guaranteed competition score or real-user usability result.
