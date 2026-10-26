"""Retrospective research metrics, including abstention and patient-level errors."""
import numpy as np
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score


def select_threshold(patients, scores):
    positive_maxima = []
    for patient, values in zip(patients, scores, strict=True):
        if patient["onset"] is not None:
            window = values[(patient["y"] == 1) & np.isfinite(values)]
            positive_maxima.append(float(np.max(window)) if len(window) else -1)
    if not positive_maxima:
        return None
    for threshold in np.arange(100, -1, -1) / 100:
        if np.mean(np.asarray(positive_maxima) >= threshold) >= 0.8:
            return float(threshold)
    return None


def evaluate(patients, scores, threshold, prevalence):
    y = np.concatenate([p["y"] for p in patients])
    predicted = np.concatenate(scores)
    scored = np.isfinite(predicted)
    ys, ps = y[scored], predicted[scored]
    septic = sum(p["onset"] is not None for p in patients)
    both_classes = len(np.unique(ys)) == 2
    detected = false_stays = 0
    for patient, values in zip(patients, scores, strict=True):
        alerts = np.isfinite(values) & (values >= threshold) if threshold is not None else np.zeros(len(values), bool)
        if patient["onset"] is not None:
            detected += int(np.any(alerts & (patient["y"] == 1)))
        else:
            false_stays += int(np.any(alerts))
    negative = y == 0
    false_hours = int(np.sum(negative & scored & (predicted >= threshold))) if threshold is not None else None
    bins = []
    for index in range(10):
        low, high = index / 10, (index + 1) / 10
        selected = (ps >= low) & (ps < high if index < 9 else ps <= high)
        bins.append({"from": low, "to": high, "count": int(selected.sum()),
                     "meanScore": float(np.mean(ps[selected])) if selected.any() else None,
                     "eventRate": float(np.mean(ys[selected])) if selected.any() else None})
    return {"patients": len(patients), "septicStays": septic, "nonSepticStays": len(patients) - septic,
            "eligibleHours": len(y), "positiveHours": int(y.sum()), "prevalence": float(y.mean()),
            "scoredHours": int(scored.sum()), "unscoredHours": int((~scored).sum()),
            "unscoredNegativeHours": int(np.sum(negative & ~scored)),
            "unscoredPositiveHours": int(np.sum((y == 1) & ~scored)),
            "auroc": float(roc_auc_score(ys, ps)) if both_classes else None,
            "averagePrecision": float(average_precision_score(ys, ps)) if both_classes else None,
            "brier": float(brier_score_loss(ys, ps)) if len(ys) else None,
            "baselineBrier": float(brier_score_loss(ys, np.full(len(ys), prevalence))) if len(ys) else None,
            "baselineAveragePrecision": float(ys.mean()) if len(ys) else None,
            "baselineAuroc": 0.5 if both_classes else None,
            "threshold": threshold, "detectedStays": detected if threshold is not None else None,
            "missedStays": septic - detected if threshold is not None else None,
            "falseAlarmStays": false_stays if threshold is not None else None,
            "negativeHours": int(negative.sum()), "falsePositiveHours": false_hours,
            "falsePositiveHoursPer100": 100 * false_hours / int(negative.sum()) if false_hours is not None and negative.any() else None,
            "reliability": bins}
