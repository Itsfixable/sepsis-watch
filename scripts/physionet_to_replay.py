#!/usr/bin/env python3
"""
Turn one PhysioNet 2019 patient file + your model's hourly scores into a
replay file for the SepsisWatch Replay page.

Usage (run from the sepsisWatch folder):

    python3 scripts/physionet_to_replay.py path/to/p000009.psv path/to/p000009_scores.csv

That writes data/replays/p000009.json. Options:

    --out FILE           where to write the replay (default: data/replays/<patient id>.json)
    --label TEXT         name in the patient picker (default: "Patient p000009")
    --description TEXT   sentence shown under the picker

Inputs
------
1. The .psv file from the PhysioNet/Computing in Cardiology Challenge 2019
   (training set A or B). It is a table separated by "|" with one row per
   hour in the ICU. We use these columns:
       HR (heart rate), O2Sat (SpO2), Temp (deg C), Resp (breathing rate),
       Age, Gender (0 = female, 1 = male), SepsisLabel.
   "NaN" means nothing was measured that hour; it becomes null.

2. A CSV of your model's scores, one row per hour, with a header row:
       hour,risk
       0,0.031
       1,0.035
   "hour" is the row number in the .psv file, counting from 0.
   If you leave out the "hour" column, rows are matched in order
   (first score = first .psv row). A column named "score" also works
   instead of "risk". Hours with no score are allowed; they show as gaps.

Sepsis onset
------------
In PhysioNet 2019, SepsisLabel switches to 1 six hours BEFORE the clinical
sepsis onset time (so models get credit for early warnings). So:
    onset hour = (first row where SepsisLabel = 1) + 6
If SepsisLabel is never 1, the patient did not develop sepsis (onset = null).

Only the Python standard library is used, so there is nothing to install.
"""

import argparse
import csv
import json
import math
import sys
from pathlib import Path

LABEL_LEAD_HOURS = 6  # SepsisLabel turns on this many hours before onset.


def fail(message):
    sys.exit("Error: " + message)


def to_number(text):
    """'NaN' or '' -> None, otherwise a float."""
    if text is None:
        return None
    text = text.strip()
    if text == "" or text.lower() == "nan":
        return None
    value = float(text)
    return None if math.isnan(value) else value


def rounded(value, digits):
    if value is None:
        return None
    return int(round(value)) if digits == 0 else round(value, digits)


def read_psv(path):
    with open(path, newline="") as f:
        rows = list(csv.DictReader(f, delimiter="|"))
    if not rows:
        fail("{} has no data rows.".format(path))
    needed = ["HR", "O2Sat", "Temp", "Resp", "SepsisLabel"]
    missing = [c for c in needed if c not in rows[0]]
    if missing:
        fail("{} is missing column(s) {}. Is it a PhysioNet 2019 .psv file?".format(path, ", ".join(missing)))
    return rows


def read_scores(path, n_hours):
    """Returns a list of length n_hours with a risk (0..1) or None for each hour."""
    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        columns = {name.strip().lower(): name for name in (reader.fieldnames or [])}
        rows = list(reader)

    risk_col = columns.get("risk") or columns.get("score")
    if risk_col is None:
        fail('{} needs a "risk" (or "score") column. Found: {}'.format(path, ", ".join(columns.values()) or "nothing"))
    hour_col = columns.get("hour")

    if hour_col is None and len(rows) != n_hours:
        fail(
            "{} has {} score rows but the .psv has {} hours. Add an \"hour\" column so "
            "each score can be matched to its hour.".format(path, len(rows), n_hours)
        )

    risks = [None] * n_hours
    for i, row in enumerate(rows):
        line = i + 2  # +1 for the header, +1 because people count from 1
        hour = i
        if hour_col is not None:
            try:
                hour = int(float(row[hour_col]))
            except (TypeError, ValueError):
                fail("{} line {}: hour {!r} is not a whole number.".format(path, line, row[hour_col]))
            if not 0 <= hour < n_hours:
                fail("{} line {}: hour {} is outside the stay (0 to {}).".format(path, line, hour, n_hours - 1))
        try:
            risk = to_number(row[risk_col])
        except ValueError:
            fail("{} line {}: risk {!r} is not a number.".format(path, line, row[risk_col]))
        if risk is not None and not 0 <= risk <= 1:
            fail("{} line {}: risk {} must be between 0 and 1.".format(path, line, risk))
        risks[hour] = None if risk is None else round(risk, 4)
    return risks


def find_onset(rows):
    labels = [to_number(r["SepsisLabel"]) for r in rows]
    first = next((i for i, v in enumerate(labels) if v == 1), None)
    if first is None:
        return None
    if first == 0:
        print(
            "Warning: SepsisLabel is already 1 in the first row, so onset may have been earlier "
            "than hour {}. Treat the lead time for this patient with care.".format(LABEL_LEAD_HOURS)
        )
    onset = first + LABEL_LEAD_HOURS
    if onset > len(rows) - 1:
        print(
            "Warning: onset hour {} is after the record ends (last hour {}). "
            "The Replay page will not be able to show the onset marker.".format(onset, len(rows) - 1)
        )
    return onset


def write_replay(record, path):
    """Write the replay JSON with one hour per line, so the file is easy to read."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = ["{"]
    for key, value in record.items():
        if key != "hours":
            lines.append("  {}: {},".format(json.dumps(key), json.dumps(value, ensure_ascii=False)))
    lines.append('  "hours": [')
    lines.append(",\n".join("    " + json.dumps(h, ensure_ascii=False) for h in record["hours"]))
    lines.append("  ]")
    lines.append("}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="Convert a PhysioNet 2019 .psv + model scores into a SepsisWatch replay.")
    parser.add_argument("psv", help="PhysioNet 2019 patient file, e.g. p000009.psv")
    parser.add_argument("scores", help="CSV of hourly model scores (columns: hour,risk)")
    parser.add_argument("--out", help="output JSON path (default: data/replays/<id>.json)")
    parser.add_argument("--label", help='name shown in the picker (default: "Patient <id>")')
    parser.add_argument("--description", help="sentence shown under the picker")
    args = parser.parse_args()

    for p in (args.psv, args.scores):
        if not Path(p).is_file():
            fail("can't find the file {}".format(p))

    patient_id = Path(args.psv).stem
    rows = read_psv(args.psv)
    risks = read_scores(args.scores, len(rows))
    onset = find_onset(rows)

    hours = []
    for i, row in enumerate(rows):
        hours.append({
            "hour": i,
            "heartRate": rounded(to_number(row["HR"]), 0),
            "respRate": rounded(to_number(row["Resp"]), 0),
            "tempC": rounded(to_number(row["Temp"]), 1),
            "spo2": rounded(to_number(row["O2Sat"]), 0),
            "risk": risks[i],
        })

    age = to_number(rows[0].get("Age"))
    gender = to_number(rows[0].get("Gender"))
    record = {
        "id": patient_id,
        "label": args.label or "Patient {}".format(patient_id),
        "description": args.description
        or "De-identified ICU record {} from the PhysioNet/Computing in Cardiology Challenge 2019, "
        "with supplied hourly scores.".format(patient_id),
        "source": "physionet2019",
        "age": None if age is None else int(round(age)),
        "sex": None if gender is None else ("M" if gender == 1 else "F"),
        "sepsisOnsetHour": onset,
        "hours": hours,
    }

    out = args.out or "data/replays/{}.json".format(patient_id)
    write_replay(record, out)

    scored = sum(r is not None for r in risks)
    print("Wrote {} ({} hours, {} with a model score).".format(out, len(hours), scored))
    print("Sepsis onset: {}".format("hour {}".format(onset) if onset is not None else "none (patient did not develop sepsis)"))
    if scored < len(hours):
        print("Note: {} hour(s) have no score and will show as gaps in the chart.".format(len(hours) - scored))


if __name__ == "__main__":
    main()
