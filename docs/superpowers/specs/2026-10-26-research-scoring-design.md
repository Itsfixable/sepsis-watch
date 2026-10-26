# Research scoring and explanations

Status: approved in chat on 2026-10-26 (“ok do taht then”), following the offer to build without further planning checkpoints. Execute inline, with independent final review.

## Intent and scope

SepsisWatch is a student research prototype. The user wants a genuine, understandable scoring model plus an LLM explanation layer, with a simple interface, followed by commits, a PR, and a verified production release. Adding technology must not imply clinical validation or guarantee competition points.

The agreed architectural direction is to separate numeric prediction from language generation. Gemini is the requested language provider. The user says their father created the key. Public Gemini activation remains unresolved: Google's current terms separately restrict API clients likely to be accessed by people under 18. An adult-owned key alone does not settle that question. The latest “yes” is being interpreted as approval to continue scoring while public Gemini calls remain disabled; the user may correct that interpretation.

This design covers the first, independently usable scoring release. A Gemini integration is a subsequent release, not something to silently substitute with a template while claiming it is AI.

## Existing behavior and constraints

- Base: GitHub main `1b0de3650cfb5c01e56dae2359d78ca862271be6` (PR #14).
- Work only in the managed isolated checkout. Preserve both existing desktop checkouts and their changes.
- Next.js 16.3.8, React 19.2.8, TypeScript and existing styling; read the installed Next.js guides before product edits.
- The three bundled patient records and their scores are synthetic. Existing Overview, Monitor and Timelines continue working unchanged.
- The public readings API stays disabled. No new uploads, patient-entry forms, connected sensors, accounts or paid services.
- The existing first-12-hour reference calculation and historical-temperature presentation stay intact.
- No stored secrets in Git, client bundles, screenshots, logs or generated artifacts.

## Approaches

1. Ask an LLM to supply a sepsis likelihood: rejected. It would not provide a trained, measured predictor and could produce unsupported medical claims.
2. Train a small numeric model offline, export reproducible outputs, and keep any language explanation independent: selected architectural direction. It fits Vercel and the current replay architecture without requiring a new inference service.
3. Deploy a Python model service plus a chatbot: deferred. It adds infrastructure, costs and user-input risks without being necessary for the requested demonstration.

Builder proposal for the numeric model: regularized logistic regression with four vital signs and explicit missingness features. This is a baseline research model, not a custom-trained LLM or a clinical product. No transformer, fine-tuning, RAG or agent framework.

## Data and reproducibility

Use the public PhysioNet/Computing in Cardiology Challenge 2019 version 1.0.0 data from official PhysioNet sources. The project metadata and license page list CC BY 4.0 and public access, while the downloadable `LICENSE.txt` contains the Open Database License (ODbL). Both were inspected on 2026-10-26; do not erase or silently resolve this discrepancy. Include both original license references, dataset and platform citations, and a description of transformations. Preserve original notices and make the derived research-data artifact available under ODbL with its full reproducible transformation code; this is a data-artifact license, not a change to the entire app's source-code license. Confirm this packaging before publishing examples and flag any unresolved requirements rather than claiming unconditional reuse rights.

Keep downloaded datasets and the Python environment out of Git. Save source URLs, download hashes, package versions, split seed, cohort counts, exclusion counts and a content hash of the trained model in a machine-readable report. Do not use mirrors when the official source requires a new access agreement; stop and ask if access requires an account or acceptance beyond the verified public license.

Hospital A supplies training/validation/internal-test patients, split 70%/15%/15%, stratified by patient outcome with seed 2026. Hospital B is an untouched external-hospital evaluation set. Split by patient before fitting any transformations. Detect duplicate patient identifiers and duplicate record-content hashes across partitions; fail if they overlap. Never tune against either test set.

## Prediction task

This release estimates a research score for a label-derived six-hour pre-onset window in retrospective ICU data. It does not claim a validated probability of sepsis, a home-monitoring result, or improved clinical outcomes.

The challenge's `SepsisLabel` is already shifted six hours ahead of its onset definition. For a record whose first positive label occurs at row `j > 0`, infer onset row `j + 6`. Use only rows before inferred onset. Positive targets are the six rows from `j` through `j + 5`; earlier eligible rows are negative. Do not shift the labels a second time.

Exclude records already positive at the first row (left-censored onset), non-monotonic labels, malformed hours or labels, and positive records whose inferred onset lies outside the recorded stay. For never-positive stays, retain only hours with at least six subsequent observed hourly rows. Report all these exclusions explicitly. Both cohorts use the same rules. Row zero is hour zero; this assumption must be checked against the source's ICU-hour field.

## Inputs and model

Only HR, Resp, Temp and O2Sat may enter the feature builder. Do not expose labels, onset time, patient ID, demographics, labs, hospital identity, stay length or future rows to it.

For each vital, derive three features from the visible prefix: latest admissible value no more than six hours old; age of that value (0–6, or 7 for unavailable); and whether a valid measurement exists at the current hour (0 or 1). These are model inputs, never replacements for the current measurements displayed in the UI. A six-hour carry window is an engineering convention, not a clinical freshness guarantee.

Use the current ingestion plausibility bounds: HR 20–250 bpm, Resp 2–80/min, Temp 25–45 °C, O2Sat 50–100%. Non-finite or out-of-bounds values count as unavailable and are counted in the report. If all four vitals lack an admissible value within six hours, return no score, not a low score.

Fit imputation medians and standardization only on training rows. Fit scikit-learn logistic regression with L2 regularization, C=1, no class weighting or oversampling, and a fixed solver/seed. Exact dependency pins and convergence settings are implementation decisions; non-convergence prevents publication. Do not silently train on synthetic data if real-data access fails.

Export model coefficients, intercept, feature order and preprocessing constants as versioned JSON. Generate all website example scores offline with this exact model. The website labels them as precomputed model outputs. Do not ship a pickle loader or train during deployment.

## Evaluation and publication

Report eligible patients/hours, positive prevalence, scored versus unscored coverage, hourly AUROC, average precision, Brier score and a reliability table for both test cohorts. A training-prevalence constant predictor is the minimum baseline. Explain that hourly observations within a stay are correlated; any reported uncertainty must resample whole patients, not rows.

Select one experimental threshold using validation patients only: among thresholds 0.00–1.00 in increments of 0.01, take the highest reaching at least 80% detection of eligible septic stays within the six-hour positive window. Unscorable septic stays count as missed. If the target is unreachable, report that failure and do not present a working alert threshold. This target is a reproducible experiment setting, not a clinical requirement or performance promise.

At the locked threshold report detected/missed septic stays, non-septic stays with any alert, and false-positive hours per 100 eligible negative hours. Report unscored negative hours separately so abstention cannot masquerade as true negatives. Use the same threshold for internal and external tests.

Do not advertise superiority over NEWS2 or commercial systems. The app's existing partial NEWS2 demonstration is not a clinical comparator for this evaluation. Poor results must remain visible; never repeatedly retune against test outcomes to reach an attractive number.

A deployable research report must reproduce, pass leakage/serialization checks, and contain honest evaluation results. If the model fails these engineering checks, do not publish invented numbers or an apparently working predictor; report the blocker and preserve the current production site. Clinical readiness is explicitly outside scope regardless of metric values.

## User experience

Builder proposal: a separate `/research` view linked from Overview and Timelines, rather than replacing the current illustrative score. Match existing components, colors, typography, keyboard behavior and mobile layout; no redesign or new top-level dashboard framework.

The view explains the task in plain language, shows the cohort evaluation and limitations, and lets visitors inspect two de-identified held-out examples (one septic and one non-septic). Choose the lexicographically first eligible patient ID from each outcome group in the internal test partition, before inspecting their model performance. Publish four vital signs only, no age, sex or other clinical fields. Cite their source IDs for reproducibility; these are de-identified research records, never synthetic patients.

For each example, synchronize a selected-hour control, four measurement tiles, a precomputed score and an observation summary. Hide future readings/scores until selected; retrospective outcome information appears only in a separately labeled result area. The initial view begins at hour zero. Label recorded/inferred onset carefully; do not say it is when a doctor recognized sepsis.

Use “Experimental model score” and “Precomputed from retrospective ICU data.” Never convert 0.62 into “62% chance of sepsis.” Do not reuse the synthetic demo's 0.30/0.60 bands or its reassurance language. Missing inputs, model-version mismatch and unavailable scores must be explicit.

The public explanation in this first release is an “Observation summary,” generated deterministically from the same revealed measurements, timestamps and reference calculations as the displayed facts. It is not labeled Gemini, AI analysis, or an explanation of why the model produced its score. Missing current temperature remains missing; an older value remains separately timestamped.

## Deferred Gemini boundary

Do not call Gemini, expose an LLM route, turn on a feature flag, or validate the key against Google's service in this first release. Do not change the user's Vercel variable. No key is needed to implement or test the numeric model.

A later, separately approved design must resolve provider eligibility and public access, cost/abuse controls and live verification. It may send only allowlisted synthetic facts selected server-side by record ID and hour, never real research records or user-entered patient data. It must use structured responses plus factual validation, timeouts, correct loading/error states and an honestly labeled fallback. It cannot change scores, diagnose, recommend treatment or imply that prose is causal model attribution. Gemini ownership alone is not activation approval.

## Verification and release

- Python tests: label boundaries, cohort exclusions, disjoint patient splits, future-row invariance, stale/missing values, training-only preprocessing, report denominators, serialization parity and deterministic examples.
- TypeScript/UI tests: artifact validation, source labels, no future leakage, missing/no-score states, synchronized selection, deterministic summary wording, and unchanged existing demos/API restrictions.
- Run the full existing test suite, new tests, lint and production build. The existing publish checkout baseline was 46 passing tests on 2026-10-26; rerun in the isolated implementation workspace after dependency setup.
- Inspect desktop/mobile rendering and keyboard navigation on a local production build. Verify `/`, `/about`, `/monitor`, `/replay`, `/replay/classic` and `/research`.
- Obtain independent code review. Commit truthful changes, push the feature branch and open/attach a PR. Do not fabricate a development timeline or remove existing attribution.
- User has requested production deployment. Merge only after checks and the preview are verified; do not bypass protections or failed checks. Verify the resulting production commit and public pages. If remote access/checks prevent completion, report precisely what remains rather than claiming deployment.

## References

- Dataset, labeling, access and citation: https://physionet.org/content/challenge-2019/1.0.0/
- Official training directory: https://physionet.org/content/challenge-2019/1.0.0/training/
- Dataset license: https://physionet.org/content/challenge-2019/view-license/1.0.0/
- Downloadable database-license file: https://physionet.org/files/challenge-2019/1.0.0/LICENSE.txt
- Gemini API terms: https://ai.google.dev/gemini-api/terms

## Approval

The user approved the scoring-first release, separate research view, and inactive Gemini integration. Commit, push, PR, and verified production deployment are authorized. Do not bypass failed checks or access controls.
