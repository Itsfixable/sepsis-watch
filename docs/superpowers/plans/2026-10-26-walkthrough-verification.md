# Temperature walkthrough and pitch revision

## Scope

User asked to continue improving toward a strict 29/30 CAC assessment and to proceed without another planning round. Implemented a focused, local-only refinement. A score target is not verification of a judging outcome. No deployment, commit, PR, new model training, or fabricated user study.

## Changes

- Derive retrospective temperature examples from each published record: a training median, a current observation, and an earlier observation.
- Only offer examples with published scores and at least one usable recent vital. Do not invent absent example types.
- Inspect every destination through its own revealed prefix. The navigation helper may scan the record, but never supplies later measurements to the selected-hour view.
- Share existing hour state across shortcuts, chart, tiles, input rows, and exact observations.
- Use native buttons, selected-step semantics, a status explanation, keyboard focus styles, and a stacked mobile layout.
- Revise the ten-slide pitch and narration around engineering decisions and demonstrated limitations. New files are v18, preserving v17.

## Iteration and verification

1. Three new tests failed before implementation: missing example derivation and missing rendered walkthrough.
2. Implemented helper and UI; all 75 Node tests passed.
3. Independent read-only review found no critical or important issues. Tightened its noted overbroad selected-button assertion. Browser interactions separately verified callback behavior.
4. Production build and lint passed. `git diff --check` passed.
5. Python suite: `.venv-research/bin/python -m unittest discover -s tests -p 'test_*.py'`: 15 passed. An initial attempt using pytest could not run because pytest is not installed; this repository's unittest suite ran successfully without installing packages.
6. `node tests/research-inputs.parity.mjs`: 123 traces match the Python pipeline, both published scores match within 1e-12.
7. Browser: record 1 buttons navigate to h1 (36.94 training median), h4 (36.17 measured), h5 (36.17 from h4). Verified current/earlier via Enter as well as mouse. Record 2 independently navigates to h0/h1/h2; h2 shows 36.78 from h1.
8. At 320px viewport width, document scroll width remains 320px and all walkthrough buttons fit. Desktop verified at 1280px.
9. Revised deck: ten slides rendered and individually inspected. Structural, geometry, font policy and reimport checks passed. Native PowerPoint execution was not tested.

## Remaining evidence limits

The 364-word script has not been timed in the student's voice with screen actions. No recorded delivery or actual first-time-user observations were supplied. Code checks establish implementation behavior, not clinical effectiveness or a guaranteed CAC score. Do not represent simulated personas as human testers. Evaluation data and model parameters remain unchanged.

Local preview: http://127.0.0.1:3003/research
