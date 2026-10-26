# Context clarity

Approved in chat: implement three targeted changes in one PR; keep data and scores unchanged.

- Show earlier vital readings in a separate, timestamped story-panel note. For Patient A at h35: temperature 38.1 °C at h34, one hour earlier. Data verification found the exact initial median is 36.95 °C (displayed elsewhere as 37.0 °C), so show the exact historical difference, 1.15 °C, with the reference value. Do not fill the h35 value or count it as current.
- Replace the story panel's “missing” wording with “not recorded this hour.” Do not infer a measurement schedule or freshness guarantee.
- Rename Monitor's Restart control to Reset demo. Preserve resetting to the initial 24 observations, paused; explain this behavior beside the controls.
- Explain the sepsis problem and intended future users (care teams and caregivers) near the top of Overview, with current synthetic-demo and clinical-validation limits intact.

## Approaches

Use separate historical context rather than carrying old readings into the current snapshot. Use Reset demo rather than changing playback to auto-start. The user approved these recommendations in chat. Reuse the existing Next.js/React components and styling; no dependencies, scoring, data, thresholds, or deployment changes.

## Acceptance

Earlier context handles absent history, insufficient reference, long gaps, decreasing readings, and current readings without mislabeling any as current. All panels use only revealed records. Desktop and phone views remain usable. Open a PR; do not merge it.
