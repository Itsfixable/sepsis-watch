#!/usr/bin/env python3
"""
Make the three SYNTHETIC (made-up) demo patients in data/replays/.

These exist only so the Replay page has something to show before real
PhysioNet records + model scores are ready. The numbers are invented to
look like realistic ICU trends; they are not real patients and not real
model output. Each file is marked "source": "synthetic" and the page
labels it "Synthetic demo".

Run from the sepsisWatch folder:

    python3 scripts/make_fake_replays.py

It always makes the same files (the random numbers use a fixed seed).
"""

import math
import random

from physionet_to_replay import write_replay  # same folder, reuses the file writer


def logistic(h, mid, width):
    return 1 / (1 + math.exp(-(h - mid) / width))


def build(hours, rng, risk_fn, hr_fn, rr_fn, temp_fn, spo2_fn, temp_every=2):
    rows = []
    for h in range(hours):
        rows.append({
            "hour": h,
            "heartRate": int(round(hr_fn(h) + rng.gauss(0, 2.5))),
            "respRate": int(round(rr_fn(h) + rng.gauss(0, 1.0))),
            # Hospital records only take temperature every few hours.
            "tempC": round(temp_fn(h) + rng.gauss(0, 0.08), 1) if h % temp_every == 0 else None,
            "spo2": min(100, int(round(spo2_fn(h) + rng.gauss(0, 0.6)))),
            "risk": round(min(0.99, max(0.01, risk_fn(h) + rng.uniform(-0.015, 0.015))), 3),
        })
    return rows


def first_red(rows, red=0.6):
    return next((r["hour"] for r in rows if r["risk"] >= red), None)


def patient_a(rng):
    """Pneumonia that turns into sepsis. Light goes red at hour 35; onset at hour 40."""
    rise = lambda h: logistic(h, 33, 3)
    rows = build(
        48, rng,
        risk_fn=lambda h: 0.10 + 0.80 * rise(h),
        hr_fn=lambda h: 84 + 38 * logistic(h, 32, 4),
        rr_fn=lambda h: 17 + 12 * logistic(h, 33, 4),
        temp_fn=lambda h: 37.0 + 2.1 * logistic(h, 34, 3),
        spo2_fn=lambda h: 96 - 6 * logistic(h, 35, 3),
    )
    assert first_red(rows) == 35, first_red(rows)
    return {
        "id": "patient-a",
        "label": "Patient A · Pneumonia",
        "description": "Synthetic demo patient: a 67-year-old woman admitted to the ICU with pneumonia.",
        "source": "synthetic",
        "age": 67,
        "sex": "F",
        "sepsisOnsetHour": 40,
        "hours": rows,
    }


def patient_b(rng):
    """Low fever after surgery that settles. Turns yellow briefly, never red, no sepsis."""
    bump = lambda h: math.exp(-((h - 12) ** 2) / 14)
    rows = build(
        40, rng,
        risk_fn=lambda h: 0.09 + 0.27 * bump(h),
        hr_fn=lambda h: 80 + 16 * bump(h),
        rr_fn=lambda h: 15 + 4 * bump(h),
        temp_fn=lambda h: 36.9 + 1.2 * bump(h),
        spo2_fn=lambda h: 97 - 1.5 * bump(h),
        temp_every=4,
    )
    assert first_red(rows) is None
    assert max(r["risk"] for r in rows) >= 0.3
    return {
        "id": "patient-b",
        "label": "Patient B · After knee surgery",
        "description": "Synthetic demo patient: a 54-year-old man recovering in the ICU the day after knee replacement surgery.",
        "source": "synthetic",
        "age": 54,
        "sex": "M",
        "sepsisOnsetHour": None,
        "hours": rows,
    }


def patient_c(rng):
    """Urinary infection in an older man. Temperature FALLS (sepsis can do that). Red at 18, onset 22."""
    rows = build(
        30, rng,
        risk_fn=lambda h: 0.10 + 0.80 * logistic(h, 16, 2.5),
        hr_fn=lambda h: 76 + 32 * logistic(h, 16, 3),
        rr_fn=lambda h: 16 + 10 * logistic(h, 16, 3),
        temp_fn=lambda h: 36.4 - 0.9 * logistic(h, 17, 3),
        spo2_fn=lambda h: 97 - 4 * logistic(h, 18, 3),
        temp_every=4,
    )
    assert first_red(rows) == 18, first_red(rows)
    return {
        "id": "patient-c",
        "label": "Patient C · Urinary infection",
        "description": "Synthetic demo patient: a 78-year-old man admitted with a urinary tract infection.",
        "source": "synthetic",
        "age": 78,
        "sex": "M",
        "sepsisOnsetHour": 22,
        "hours": rows,
    }


def main():
    rng = random.Random(2026)
    for make in (patient_a, patient_b, patient_c):
        record = make(rng)
        path = "data/replays/{}.json".format(record["id"])
        write_replay(record, path)
        print("Wrote {} ({} hours)".format(path, len(record["hours"])))


if __name__ == "__main__":
    main()
