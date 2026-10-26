# Usability review follow-up

User approved verifying and fixing the remaining AI-walkthrough findings. These are simulated personas, not five participants or measured success rates. Scope is local only, preserving prior uncommitted research work.

## Confirmed and addressed
- Research missing from navigation: added active-state route link and focusable record jump target.
- Fractional temperature reference hidden by one-decimal display: shared formatter retains up to two decimals, including 36.95 and +0.05, without changing underlying calculations. Research tiles use it too; exact observations remain untouched.
- Timeline mobile hour hidden and slider focus too close to label: full-width mobile scrubber, visible selected hour, separate previous/next-hour buttons that pause playback and disable at endpoints. Play/Pause/Restart has visible text and current status.
- Confusing reset request: kept intended preloaded Monitor behavior, explicitly labeled Reset to hour 23, explained paused outcome and zero-based hours versus observation counts. Revised tester task to ask about the on-screen reset control.
- Data-source wording: Overview now states invented demo patients/scores versus separate trained research on de-identified records.
- Results readability: plain false-alarm summary precedes the table, with horizontal-scroll guidance. Singular reading grammar and earlier-reading time-unit wrapping corrected.

## Verification
- Five initial regression failures observed (four new tests plus revised Monitor wording expectation), caused by absent formatter, links, controls, singular/display corrections and reset labeling.
- 72 Node tests pass after fixes, including rendered Research page input-metadata wiring assertion previously deferred. Lint, production build and diff whitespace checks pass.
- 15 Python tests and 123 hourly preprocessing comparisons pass. Published scores match within 1e-12. No modifications to data/research or scripts/research.
- Browser at 320px: document has no horizontal overflow on Overview, Research, Timelines or Monitor. Navigation fits. Record jump focuses its heading. Timeline steps move h35 to h34 and back, pause playback, and disable at first/last hours. Keyboard-focused slider label visible. h12 temperature shows 36.95 reference and +0.05; singular wording correct. Reset returns to h23 paused.
- Independent read-only reviewer found no Critical/Important issues. Minor null-threshold copy referred to results above after table moved; corrected to table below.
- Reviewer deferred browser/screen-reader behavior to parent (browser checked, no screen-reader claim), build/tests to parent (run), prior research implementation beyond integration (prior review plus regression checks), and scientific validity/provenance (unchanged, no new medical claims).

## Boundaries
No new medical significance thresholds, no model retraining, no invented human observations, no commit, PR, push or deployment. Remaining: real first-time-user sessions on this build and separate authorization to publish. The local 127.0.0.1 URL is only reachable on the same computer.
