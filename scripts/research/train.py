"""Run the fixed experiment. Test sets are never used for fitting or tuning."""
import argparse
from collections import Counter
import hashlib
from importlib.metadata import version
import json
from pathlib import Path

import numpy as np
from sklearn.model_selection import train_test_split

from .data import SOURCE, MIRROR, assert_disjoint, choose_examples, read_patient
from .evaluation import evaluate, select_threshold
from .model import fit_model, predict_export


def json_bytes(value):
    return (json.dumps(value, sort_keys=True, indent=2, allow_nan=False) + "\n").encode()


def run_experiment(source, output, expected_counts=None):
    expected_counts = expected_counts or {"A": 20336, "B": 20000}
    cohorts, exclusions, input_hashes = {}, {}, {}
    all_raw = []
    for name, expected in expected_counts.items():
        files = sorted((Path(source) / name).glob("p*.psv"))
        if len(files) != expected:
            raise ValueError(f"Incomplete cohort {name}: {len(files)} != {expected}")
        patients = [read_patient(path, name) for path in files]
        all_raw.append(patients)
        manifest = [{"id": p["id"], "sha256": p["sha256"]} for p in patients]
        input_hashes[name] = hashlib.sha256(json_bytes(manifest)).hexdigest()
        exclusions[name] = {"rawPatients": len(patients), "rawHours": sum(p["rawHours"] for p in patients),
                            "invalidValues": sum(p["invalidValues"] for p in patients),
                            "reasons": dict(sorted(Counter(p["exclusion"] for p in patients if p["exclusion"]).items()))}
        cohorts[name] = [p for p in patients if p["exclusion"] is None]
        print(f"Loaded {name}: {len(cohorts[name])}/{len(patients)} eligible", flush=True)
    assert_disjoint(all_raw)
    a, b = cohorts["A"], cohorts["B"]
    train, remainder = train_test_split(a, test_size=0.30, random_state=2026,
                                      stratify=[p["onset"] is not None for p in a])
    validation, internal = train_test_split(remainder, test_size=0.5, random_state=2026,
                                           stratify=[p["onset"] is not None for p in remainder])
    assert_disjoint([train, validation, internal, b])
    selected = choose_examples(internal)  # Selection precedes fitting or observing performance.
    x = np.concatenate([p["x"][p["scorable"]] for p in train])
    y = np.concatenate([p["y"][p["scorable"]] for p in train])
    prevalence = float(np.concatenate([p["y"] for p in train]).mean())
    pipe, model = fit_model(x, y)
    np.testing.assert_allclose(predict_export(model, x), pipe.predict_proba(x)[:, 1], atol=1e-12)
    model_raw = json_bytes(model)
    model_hash = hashlib.sha256(model_raw).hexdigest()

    def predictions(patients):
        result = []
        for patient in patients:
            values = predict_export(model, patient["x"])
            values[~patient["scorable"]] = np.nan
            result.append(values)
        return result

    validation_scores = predictions(validation)
    threshold = select_threshold(validation, validation_scores)
    report = {"schemaVersion": 1, "modelSha256": model_hash, "seed": 2026,
              "source": SOURCE, "downloadMirror": MIRROR + "challenge-2019/1.0.0/training/",
              "hourConvention": "Elapsed hours since first recorded row; consecutive positive integer ICULOS required",
              "datasetVersion": "1.0.0", "inputManifestSha256": input_hashes,
              "packages": {name: version(name) for name in ("numpy", "scipy", "scikit-learn", "joblib", "threadpoolctl")},
              "trainingPatients": len(train), "trainingScoredHours": len(y),
              "trainingPrevalence": prevalence, "threshold": threshold, "exclusions": exclusions,
              "splitPatientIds": {name: sorted(p["id"] for p in group) for name, group in
                                  (("train", train), ("validation", validation), ("internalTest", internal), ("externalTest", b))},
              "validation": evaluate(validation, validation_scores, threshold, prevalence),
              "internalTest": evaluate(internal, predictions(internal), threshold, prevalence),
              "externalTest": evaluate(b, predictions(b), threshold, prevalence)}
    records = []
    for index, (patient, scores) in enumerate(zip(selected, predictions(selected), strict=True), 1):
        hours = []
        for hour, (vitals, score) in enumerate(zip(patient["vitals"], scores, strict=True)):
            row = {key: float(value) if np.isfinite(value) else None for key, value in
                   zip(("heartRate", "respRate", "tempC", "spo2"), vitals, strict=True)}
            hours.append({"hour": hour, **row, "risk": float(score) if np.isfinite(score) else None})
        records.append({"id": patient["id"], "label": f"Research record {index}", "source": "physionet2019",
                        "sourceSha256": patient["sha256"], "inferredOnsetHour": patient["onset"], "hours": hours})
    examples = {"schemaVersion": 1, "modelSha256": model_hash, "records": records}
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    for name, raw in (("model.json", model_raw), ("report.json", json_bytes(report)), ("examples.json", json_bytes(examples))):
        (output / name).write_bytes(raw)
    print(f"Exported model {model_hash[:12]}, threshold {threshold}", flush=True)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, default=Path("data/research"))
    args = parser.parse_args()
    run_experiment(args.source, args.output)
