"""Official data acquisition and label/feature construction, kept separate."""
import argparse
import hashlib
import io
import re
import time
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import urlopen
from urllib.parse import urlencode

import numpy as np

SOURCE = "https://physionet.org/files/challenge-2019/1.0.0/training/"
MIRROR = "https://physionet-open.s3.amazonaws.com/"
VITALS = ("HR", "Resp", "Temp", "O2Sat")
BOUNDS = ((20, 250), (2, 80), (25, 45), (50, 100))
FEATURE_NAMES = [f"{vital}_{part}" for vital in VITALS for part in ("value", "age", "current")]


def patient_files(html):
    return sorted(set(re.findall(r'href="(p[0-9]+\.psv)"', html)))


def object_manifest(xml, prefix):
    root = ET.fromstring(xml)
    ns = {"s": "http://s3.amazonaws.com/doc/2006-03-01/"}
    names = []
    for key in root.findall("s:Contents/s:Key", ns):
        value = key.text or ""
        name = value.removeprefix(prefix)
        if not value.startswith(prefix) or not re.fullmatch(r"p[0-9]+\.psv", name):
            raise ValueError("Unexpected path in official data manifest")
        names.append(name)
    token = root.findtext("s:NextContinuationToken", None, ns)
    if root.findtext("s:IsTruncated", "false", ns) == "true" and not token:
        raise ValueError("Truncated manifest is missing its continuation token")
    return names, token


def download(destination):
    """Resume official public downloads; never follows links supplied by records."""
    for cohort, expected in (("A", 20336), ("B", 20000)):
        prefix = f"challenge-2019/1.0.0/training/training_set{cohort}/"
        base = MIRROR + prefix
        names, token = [], None
        while True:
            params = {"list-type": "2", "prefix": prefix, "max-keys": "1000"}
            if token:
                params["continuation-token"] = token
            with urlopen(MIRROR + "?" + urlencode(params), timeout=45) as response:
                page, token = object_manifest(response.read().decode(), prefix)
            names.extend(page)
            if not token:
                break
        names = sorted(set(names))
        if len(names) != expected:
            raise ValueError(f"Unexpected {cohort} manifest: {len(names)} instead of {expected}")
        folder = Path(destination) / cohort
        folder.mkdir(parents=True, exist_ok=True)

        def fetch(name):
            target = folder / name
            if target.exists() and target.stat().st_size > 100:
                return
            for attempt in range(4):
                try:
                    with urlopen(base + name, timeout=45) as response:
                        raw = response.read(8_000_001)
                    if len(raw) > 8_000_000 or not raw.startswith(b"HR|O2Sat|Temp|"):
                        raise ValueError(f"Invalid patient response: {name}")
                    temporary = target.with_suffix(".part")
                    temporary.write_bytes(raw)
                    temporary.replace(target)
                    return
                except Exception:
                    if attempt == 3:
                        raise
                    time.sleep(2 ** attempt)

        with ThreadPoolExecutor(max_workers=8) as pool:
            jobs = [pool.submit(fetch, name) for name in names]
            for done, job in enumerate(as_completed(jobs), 1):
                job.result()
                if done % 1000 == 0 or done == len(names):
                    print(f"Downloaded {cohort}: {done}/{len(names)}", flush=True)


def eligible_target(labels, icu_hours):
    labels, hours = np.asarray(labels), np.asarray(icu_hours)
    empty = np.array([], dtype=int)
    if not len(labels) or not np.isin(labels, [0, 1]).all():
        return empty, None, "malformed_labels"
    if (len(hours) != len(labels) or not np.isfinite(hours).all() or
            np.any(hours < 1) or np.any(hours != np.floor(hours)) or np.any(np.diff(hours) != 1)):
        return empty, None, "malformed_hours"
    if np.any(np.diff(labels) < 0):
        return empty, None, "non_monotonic_labels"
    positive = np.flatnonzero(labels)
    if len(positive):
        if positive[0] == 0:
            return empty, None, "left_censored"
        onset = int(positive[0]) + 6
        if onset >= len(labels):
            return empty, None, "onset_outside_stay"
        return labels[:onset].astype(int), onset, None
    if len(labels) <= 6:
        return empty, None, "insufficient_followup"
    return labels[:-6].astype(int), None, None


def sanitize(vitals):
    clean = np.array(vitals, dtype=float, copy=True)
    if clean.ndim != 2 or clean.shape[1] != 4:
        raise ValueError("Expected exactly four vital columns")
    for column, (low, high) in enumerate(BOUNDS):
        good = np.isfinite(clean[:, column]) & (clean[:, column] >= low) & (clean[:, column] <= high)
        clean[~good, column] = np.nan
    return clean


def features(vitals):
    clean = sanitize(vitals)
    matrix = np.empty((len(clean), 12), dtype=float)
    available = np.zeros(len(clean), dtype=bool)
    indices = np.arange(len(clean))
    for column in range(4):
        valid = np.isfinite(clean[:, column])
        last = np.maximum.accumulate(np.where(valid, indices, -8))
        age = indices - last
        recent = (last >= 0) & (age <= 6)
        carried = clean[np.maximum(last, 0), column] if len(clean) else np.array([])
        matrix[:, 3 * column] = np.where(recent, carried, np.nan)
        matrix[:, 3 * column + 1] = np.where(recent, age, 7)
        matrix[:, 3 * column + 2] = valid.astype(float)
        available |= recent
    return matrix, available


def read_patient(path, cohort):
    raw = path.read_bytes()
    headers = raw.splitlines()[0].decode().split("|")
    columns = [headers.index(name) for name in (*VITALS, "SepsisLabel", "ICULOS")]
    array = np.loadtxt(io.BytesIO(raw), delimiter="|", skiprows=1, usecols=columns, ndmin=2)
    y, onset, reason = eligible_target(array[:, 4], array[:, 5])
    cleaned = sanitize(array[:, :4])
    invalid = int(np.sum(~np.isnan(array[:, :4]) & np.isnan(cleaned)))
    x, scorable = features(cleaned[:len(y)])
    return {"id": f"{cohort}:{path.stem}", "sha256": hashlib.sha256(raw).hexdigest(),
            "y": y, "onset": onset, "exclusion": reason, "x": x, "scorable": scorable,
            "vitals": cleaned[:len(y)], "invalidValues": invalid, "rawHours": len(array)}


def assert_disjoint(partitions):
    ids, hashes = set(), set()
    for partition in partitions:
        for patient in partition:
            if patient["id"] in ids or patient["sha256"] in hashes:
                raise ValueError(f"Duplicate patient ID or record content: {patient['id']}")
            ids.add(patient["id"])
            hashes.add(patient["sha256"])


def choose_examples(patients):
    ordered = sorted(patients, key=lambda p: p["id"])
    return [next(p for p in ordered if p["onset"] is not None),
            next(p for p in ordered if p["onset"] is None)]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download public PhysioNet 2019 records from the official source")
    parser.add_argument("destination", type=Path)
    download(parser.parse_args().destination)
