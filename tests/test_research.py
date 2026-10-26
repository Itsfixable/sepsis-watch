"""Hand-derived fixtures test the experiment, not clinical performance."""
import importlib.util
import sys
import unittest
import tempfile
import json
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
AVAILABLE = importlib.util.find_spec("scripts.research") is not None
if AVAILABLE:
    from scripts.research.data import eligible_target, features, assert_disjoint, choose_examples, patient_files
    from scripts.research.model import fit_model, predict_export
    from scripts.research.evaluation import evaluate, select_threshold


class ResearchTests(unittest.TestCase):
    def setUp(self):
        self.assertTrue(AVAILABLE, "Research pipeline has not been implemented")

    def test_labels_are_shifted_once_and_post_onset_is_excluded(self):
        y, onset, reason = eligible_target([0, 0, 0] + [1] * 9, list(range(1, 13)))
        self.assertEqual(y.tolist(), [0, 0, 0, 1, 1, 1, 1, 1, 1])
        self.assertEqual(onset, 9)
        self.assertIsNone(reason)

    def test_negative_stays_need_six_followup_rows(self):
        y, onset, reason = eligible_target([0] * 10, list(range(1, 11)))
        self.assertEqual(y.tolist(), [0, 0, 0, 0])
        self.assertIsNone(onset)
        self.assertIsNone(reason)

    def test_hour_origin_is_first_record_not_icu_admission(self):
        y, onset, reason = eligible_target([0] * 3 + [1] * 9, list(range(7, 19)))
        self.assertIsNone(reason)
        self.assertEqual(onset, 9)
        self.assertEqual(len(y), 9)
        for hours in [list(range(10)), [i + .5 for i in range(10)], [1, 2, 2] + list(range(4, 11))]:
            self.assertEqual(eligible_target([0] * 10, hours)[2], "malformed_hours")

    def test_excludes_ambiguous_and_malformed_records(self):
        for labels, hours, expected in [
            ([1] * 10, list(range(1, 11)), "left_censored"),
            ([0, 1, 0], [1, 2, 3], "non_monotonic_labels"),
            ([0, 1, 1], [1, 2, 3], "onset_outside_stay"),
            ([0] * 10, [1, 2, 4] + list(range(5, 12)), "malformed_hours"),
            ([0, 2], [1, 2], "malformed_labels"),
            ([0] * 6, list(range(1, 7)), "insufficient_followup"),
        ]:
            with self.subTest(expected=expected):
                self.assertEqual(eligible_target(labels, hours)[2], expected)

    def test_features_are_causal_and_expire_after_six_hours(self):
        values = np.full((9, 4), np.nan)
        values[0] = [80, 16, 37, 97]
        x, available = features(values)
        np.testing.assert_equal(x[6], [80, 6, 0, 16, 6, 0, 37, 6, 0, 97, 6, 0])
        self.assertTrue(available[6])
        self.assertFalse(available[7])
        self.assertTrue(np.isnan(x[7, 0]))
        self.assertEqual(x[7, 1], 7)
        changed = values.copy()
        changed[8] = [150, 30, 39, 90]
        np.testing.assert_equal(features(changed)[0][:8], x[:8])
        np.testing.assert_equal(features(values[:4])[0], x[:4])

    def test_invalid_vitals_do_not_become_model_inputs(self):
        x, available = features(np.array([[19, 81, 46, 101], [20, 2, 25, 50]], dtype=float))
        self.assertFalse(available[0])
        self.assertTrue(available[1])
        np.testing.assert_equal(x[1, ::3], [20, 2, 25, 50])

    def test_partition_overlap_is_rejected_by_id_and_content(self):
        a = {"id": "a", "sha256": "1"}
        assert_disjoint([[a], [{"id": "b", "sha256": "2"}]])
        for b in [{"id": "a", "sha256": "2"}, {"id": "b", "sha256": "1"}]:
            with self.assertRaises(ValueError):
                assert_disjoint([[a], [b]])

    def test_examples_are_selected_by_id_not_model_performance(self):
        patients = [{"id": "z", "onset": 10}, {"id": "a", "onset": 12}, {"id": "b", "onset": None}]
        self.assertEqual([p["id"] for p in choose_examples(patients)], ["a", "b"])

    def test_download_manifest_rejects_paths_and_deduplicates(self):
        html = '<a href="p000001.psv">x</a><a href="../bad.psv">x</a><a href="p000001.psv">x</a>'
        self.assertEqual(patient_files(html), ["p000001.psv"])

    def test_official_mirror_manifest_only_accepts_expected_record_paths(self):
        from scripts.research import data
        self.assertTrue(hasattr(data, "object_manifest"), "Paginated official-mirror manifests are unsupported")
        xml = '<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><IsTruncated>true</IsTruncated><NextContinuationToken>next</NextContinuationToken><Contents><Key>prefix/p000001.psv</Key></Contents></ListBucketResult>'
        self.assertEqual(data.object_manifest(xml, "prefix/"), (["p000001.psv"], "next"))
        with self.assertRaises(ValueError):
            data.object_manifest(xml, "other/")

    def test_training_preprocessing_and_export_prediction_match(self):
        x = np.array([[80, 0, 1] * 4, [100, 0, 1] * 4, [120, 1, 0] * 4, [np.nan, 7, 0] * 4], dtype=float)
        y = np.array([0, 0, 1, 1])
        pipe, artifact = fit_model(x, y)
        self.assertEqual(artifact["imputation"][0], 100)
        before = list(artifact["imputation"])
        query = np.array([[9999, 0, 1] * 4, [np.nan, 7, 0] * 4])
        np.testing.assert_allclose(predict_export(artifact, query), pipe.predict_proba(query)[:, 1], atol=1e-12)
        self.assertEqual(artifact["imputation"], before)

    def test_metrics_keep_unscorable_cases_and_negative_coverage(self):
        patients = [
            {"id": "s1", "onset": 7, "y": np.array([0, 1, 1])},
            {"id": "s2", "onset": 7, "y": np.array([0, 1, 1])},
            {"id": "n1", "onset": None, "y": np.array([0, 0])},
        ]
        scores = [np.array([0.1, 0.8, 0.9]), np.array([np.nan, np.nan, np.nan]), np.array([0.7, np.nan])]
        r = evaluate(patients, scores, 0.5, 0.2)
        self.assertEqual(r["detectedStays"], 1)
        self.assertEqual(r["missedStays"], 1)
        self.assertEqual(r["falseAlarmStays"], 1)
        self.assertEqual(r["unscoredNegativeHours"], 2)
        self.assertEqual(r["falsePositiveHoursPer100"], 25)
        self.assertIsNone(select_threshold(patients, scores))

    def test_threshold_uses_positive_windows_not_earlier_alarms(self):
        patients = [{"id": "s", "onset": 7, "y": np.array([0, 1, 1])}]
        self.assertEqual(select_threshold(patients, [np.array([0.99, 0.35, 0.45])]), 0.45)

    def test_reliability_bins_count_boundary_scores_exactly_once(self):
        values = np.arange(11) / 10
        patient = {"onset": None, "y": np.zeros(11, dtype=int)}
        bins = evaluate([patient], [values], .5, .2)["reliability"]
        self.assertEqual([b["count"] for b in bins], [1] * 9 + [2])

    def test_full_experiment_exports_reproducible_artifacts(self):
        self.assertIsNotNone(importlib.util.find_spec("scripts.research.train"), "Experiment export is missing")
        from scripts.research.train import run_experiment
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for cohort, count, start in [("A", 40, 80), ("B", 20, 100)]:
                (root / cohort).mkdir()
                for i in range(count):
                    lines = ["HR|Resp|Temp|O2Sat|SepsisLabel|ICULOS"]
                    lines += [f"{start+i/10+t/20}|16|37|97|{int(i%2==0 and t>=5)}|{t+1}" for t in range(20)]
                    (root / cohort / f"p{i:06}.psv").write_text("\n".join(lines) + "\n")
            run_experiment(root, root / "first", {"A": 40, "B": 20})
            run_experiment(root, root / "second", {"A": 40, "B": 20})
            for name in ["model.json", "report.json", "examples.json"]:
                self.assertEqual((root / "first" / name).read_bytes(), (root / "second" / name).read_bytes())
            report = json.loads((root / "first" / "report.json").read_text())
            self.assertEqual(report["internalTest"]["patients"], 6)
            self.assertEqual(report["externalTest"]["patients"], 20)
            self.assertEqual(report["trainingPatients"], 28)
            examples = json.loads((root / "first" / "examples.json").read_text())
            self.assertEqual(len(examples["records"]), 2)
            self.assertEqual(examples["modelSha256"], report["modelSha256"])
            self.assertNotIn("age", examples["records"][0])


if __name__ == "__main__":
    unittest.main()
