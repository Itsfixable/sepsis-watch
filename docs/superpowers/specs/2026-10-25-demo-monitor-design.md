# Demo Monitor — short design

Status: approved by the user with “build it” on 2026-10-25.

## Intent

Make `/monitor` useful and dependable for a first-time visitor on the public Vercel site. It demonstrates a stream of synthetic observations without depending on a running laptop, shared server memory, or a real sensor.

## Approaches and selected direction

- **Self-contained demo (selected):** bundled synthetic records advance within each visitor's browser. No database, accounts, or shared writes. This is the submission-focused option.
- **Hosted live service (not selected):** persistent database and authenticated ingestion. It would support shared live data but adds infrastructure and verification beyond this change.

## Proposed behavior

- Retain the existing Monitor layout and visual language; reuse its chart and vital-sign components where appropriate.
- Default to synthetic Patient A, showing its first 24 hourly observations immediately. Reveal one additional observation every three seconds, with the accelerated pace stated on screen.
- Provide Pause/Resume and Restart controls. Restart returns to the initial 24 observations and pauses; playback stops at the end rather than silently looping. A patient selector can use the three existing synthetic scenarios and resets the session when changed.
- Use record-relative time such as `Hour 23 of 47`, never imply these are current wall-clock readings. Charts and tables include only observations revealed so far.
- Keep a persistent `Synthetic demo data` notice. Call the scores illustrative, not probabilities or validated predictions; do not imply that hardware or an AI model is producing them live.
- Preserve missing values as missing. Any earlier measurement shown for context must be separately labeled with its age, not substituted as the current measurement.
- Each visitor has an independent session. Refreshing starts over. The demo makes no calls to the live readings API and stores no patient data in a database or browser storage.

## Local API demonstration

- Preserve the existing Python sender and live Monitor workflow behind an explicit local-only configuration switch, disabled by default.
- On Vercel, always use demo mode and reject GET/POST requests to the live readings API with an explanatory response. A local setting must not accidentally enable ingestion on Vercel.
- Document how to start the local API demo bound to localhost, and update the sender's stale `fake_pi.py` instructions to `demo_pi.py`.
- Keep the existing in-memory store for that local demonstration only. Do not represent it as durable storage or a production-ready medical service.

## Constraints and non-goals

No new dependencies, subscriptions, database, authentication service, real patient data, trained model, sensor integration, threshold changes, or changes to the existing Timelines behavior. Broader Overview/README wording cleanup remains a separate checklist item, except instructions directly affected by the Monitor change.

## Verification and handoff

Add regression tests for bounded progression, restart, missing values, synthetic-only records, and local/public mode separation. Run the full tests and production build. Check the public demo in desktop and mobile browser sizes, including keyboard controls, pause/resume, end-of-record behavior, independent sessions, and the disabled public ingestion path. Test the Python/API workflow locally with synthetic data.

Implement on a new `demo-monitor` branch and create a separate pull request. Report the preview and verification results before merging. The exact component structure and configuration variable names are implementation decisions; the user has not specified them.
