# Four-vital research experiment

This is a retrospective student experiment, not a validated medical device or an individual sepsis likelihood calculator. It does not establish usefulness at home, clinical benefit, or superiority over NEWS2 or commercial products. The separate synthetic Monitor/Timelines are unchanged.

## Data, attribution and licenses

Contains information from **Early Prediction of Sepsis from Clinical Data: the PhysioNet/Computing in Cardiology Challenge 2019**, version 1.0.0, made available here under the [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/).

- Dataset: Reyna, M. et al. (2019). [PhysioNet dataset](https://physionet.org/content/challenge-2019/1.0.0/). DOI: [10.13026/v64v-d857](https://doi.org/10.13026/v64v-d857).
- Platform: Goldberger, A. L. et al. (2000). PhysioBank, PhysioToolkit, and PhysioNet: Components of a New Research Resource for Complex Physiologic Signals. *Circulation*, 101(23), e215–e220. DOI: [10.1161/01.CIR.101.23.e215](https://doi.org/10.1161/01.CIR.101.23.e215).
- Source metadata and [license page](https://physionet.org/content/challenge-2019/view-license/1.0.0/) list **CC BY 4.0** ([license text](https://creativecommons.org/licenses/by/4.0/legalcode)). The distributed [LICENSE.txt](https://physionet.org/files/challenge-2019/1.0.0/LICENSE.txt) instead contains **ODbL 1.0**. Both source notices are retained here; this project does not silently resolve that discrepancy.
- The derived research database in this directory is offered under **ODbL 1.0**, with attribution retained. This notice concerns research data, not the entire application's software license. It is provided without warranty.
- The complete method of alterations is available free of charge in [`scripts/research`](../../scripts/research), including all preprocessing, splitting, training, evaluation and example selection. No additional private data is used.

Download uses the anonymous official `physionet-open` S3 bucket documented by PhysioNet, at `challenge-2019/1.0.0/training/`. Raw data and the Python environment remain git-ignored. Only two de-identified, four-vital examples are bundled; no demographic or laboratory columns are published in them. Dataset record IDs are retained for reproducibility, not as real-world identities. No research records are sent to an LLM.

## Reproduce

Run from the repository root with Python 3.12:

```sh
python3.12 -m venv .venv-research
.venv-research/bin/python -m pip install -r scripts/research/requirements.txt
.venv-research/bin/python -m scripts.research.data .research-cache/physionet2019
.venv-research/bin/python -m unittest discover -s tests -p 'test_research.py'
.venv-research/bin/python -m scripts.research.train .research-cache/physionet2019
.venv-research/bin/python -m scripts.research.train .research-cache/physionet2019 --output .research-cache/reproduced
diff data/research/model.json .research-cache/reproduced/model.json
diff data/research/report.json .research-cache/reproduced/report.json
diff data/research/examples.json .research-cache/reproduced/examples.json
npm test
npm run lint
npm run build
```

The downloader requires all 20,336 A and 20,000 B source files, resumes completed files, and rejects unexpected manifest paths. Exact model bytes can differ across numerical-library versions/platforms; package versions are pinned and recorded. Same-environment reruns must reproduce all three artifacts byte for byte. Never commit downloaded datasets, virtual environments or API keys.

## What is exported

- `model.json`: feature order, training-only imputation medians, scaling constants, 12 coefficients and intercept. JSON only; no pickle loader.
- `report.json`: all split IDs, source-manifest hashes, package versions, counts/exclusions, validation threshold and complete internal/external evaluation. Manifest SHA-256 is over the sorted list of source IDs and each raw file's SHA-256, serialized by `json_bytes`.
- `examples.json`: the lexicographically first eligible internal-test record in each outcome group, chosen before inspecting scores; current four-vital measurements and offline predictions. Source hashes and the exact exported model hash tie them to the experiment.

The website checks artifact schemas, chronology, ranges, denominators and model hash at build time. It does not fit or run the model at request time, accept patient uploads, or invoke Gemini. “Observation summary” is deterministic text from the revealed measurements, not a model explanation.

## Fixed protocol

1. Read only HR, Resp, Temp and O2Sat as model inputs. SepsisLabel and ICULOS are used exclusively for targets and temporal checks. Hour zero means the first recorded row, not necessarily admission. Require consecutive positive integer ICULOS values, allowing a non-one starting hour.
2. The labels are already shifted six hours before onset. First positive row `j > 0` implies onset row `j + 6`; use rows before onset, retaining the six positive pre-onset rows. Exclude first-row-positive, malformed/non-monotonic, onset-outside-stay and insufficient-follow-up records. Trim the final six rows of all-negative stays. Counts are in the report. These restrictions can bias the cohort.
3. Reject duplicate record IDs/content. Split eligible A records 70/15/15 by record, stratified by outcome, seed 2026. B is external test only. Released IDs do not let us detect distinct stays from the same individual.
4. Convert out-of-range/nonfinite readings to unavailable: HR 20–250, Resp 2–80, Temp 25–45, O2Sat 50–100. These are engineering plausibility bounds, not normal ranges. Carry each latest valid value at most six hours, with age and current-observation flags. No recent valid values for all four means no score. Carry-forward is not a guarantee of clinical freshness.
5. Fit median imputation and standardization on scored training rows only. Fit L2 logistic regression, C=1, lbfgs, max_iter=2000, seed=2026, no weighting/oversampling. Nonconvergence stops export. Check coefficient-export parity against the fitted pipeline to absolute tolerance 1e-12.
6. Pick the highest threshold on the fixed 0.00–1.00 grid (step 0.01) achieving at least 80% validation-stay detection in the positive window; unscorable septic stays count as missed. If unreachable, no threshold is exported. Never tune on internal or external test.
7. Publish both cohorts, not just selected successes. Ranking/Brier/reliability use scored hours. Unscored positive/negative hours are explicit. False-positive-hour rates use **all** eligible negative hours, so inspect abstention alongside them. The constant baseline predicts training prevalence. Hours within a stay are correlated; no confidence intervals are claimed.

## Development correction

An initial parser incorrectly required ICULOS to start at 1 and excluded valid offset records. It was corrected after inspecting the source-hour sequences; a regression test now covers offset starts. That invalid-cohort run was discarded. Model inputs, hyperparameters, threshold grid and selection criterion were not changed in response to test performance. The published artifacts use the corrected protocol above.

## Limits

These scores are uncalibrated; do not present them as individual percentages or “accuracy.” A high detection rate can come with an unacceptable false-alarm burden. The model has no prospective, clinical or home-monitoring validation. Two examples are for inspecting software, not proving performance. Clinical NEWS2 is not evaluated here, and the synthetic partial-NEWS2 display is not a validated comparator. Hardware and any eligible, separately approved Gemini integration remain future work.
