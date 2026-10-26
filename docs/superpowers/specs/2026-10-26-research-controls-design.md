# Research controls and pitch revision

Approved in chat: both website controls and presentation changes; user said “k, build it”.

## Scope
Preserve the Research visual language and add Full scale / Zoomed scale controls, explicit ranges, and an optional Jump to first available score shortcut. Full scale remains the default. Zoom uses only revealed observations, includes zero and the fixed threshold, preserves missing-score gaps and never changes predictions. The shortcut is retrospective navigation, not a prediction. Hour zero stays accessible. Changing records resets the hour and scale.

## Approaches
Presentation-only changes were considered but leave the chart unreadable at small scores. User selected both a focused UI improvement and a pitch revision. No redesign, new model, provider integration, or production deployment.

## Presentation
Keep introduction, purpose, technologies, continuous website walkthrough, technical explanation, results, close. Explain why the code uses medians, record-level splits and training-only preprocessing. Use actual local screenshots and retain the distinction between synthetic demo and retrospective research. Target under three minutes. No guaranteed judging score.

## Verification
Test missing scores, zero and unit scores, future-score exclusion, range labels, initial default, unavailable shortcut, keyboard actions, mobile layout and record reset. Check full Node suite, lint and production build. Preserve research artifacts byte for byte.
