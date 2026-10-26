#!/usr/bin/env python3
"""
Pretend to be the Raspberry Pi: send readings to the dashboard so you can
test the home page without any hardware.

It takes a replay patient from data/replays/ and POSTs their hours to
/api/readings one at a time, as if they were happening live.

Run from the sepsisWatch folder, while `npm run dev` is running in
another Terminal window:

    python3 scripts/fake_pi.py

Options:
    --patient ID    which replay to send (default: patient-a)
    --backfill N    send the first N hours straight away (default: 24)
    --every S       then send one more hour every S seconds (default: 10)
    --url URL       dashboard address (default: http://localhost:3000)

The fake clock runs fast: each new reading is stamped one hour after the
last one, even though only a few seconds pass. Press Ctrl+C to stop.
Readings stay in the server's memory until you stop `npm run dev`.
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone


def post(url, reading):
    request = urllib.request.Request(
        url + "/api/readings",
        data=json.dumps(reading).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return response.status
    except urllib.error.HTTPError as error:
        # The server answered but rejected the reading: show its explanation.
        sys.exit("Server rejected the reading ({}): {}".format(error.code, error.read().decode()))
    except urllib.error.URLError as error:
        sys.exit("Could not reach {} ({}). Is `npm run dev` running?".format(url, error.reason))


def main():
    parser = argparse.ArgumentParser(description="Send fake bedside readings to SepsisWatch.")
    parser.add_argument("--patient", default="patient-a")
    parser.add_argument("--backfill", type=int, default=24)
    parser.add_argument("--every", type=float, default=10)
    parser.add_argument("--url", default="http://localhost:3000")
    args = parser.parse_args()

    path = "data/replays/{}.json".format(args.patient)
    try:
        with open(path, encoding="utf-8") as f:
            hours = json.load(f)["hours"]
    except FileNotFoundError:
        sys.exit("Can't find {}. Run this from the sepsisWatch folder.".format(path))

    # Hour 0 is stamped `backfill` hours ago, so the backfilled history ends at about "now".
    start = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0) - timedelta(hours=args.backfill)

    for i, hour in enumerate(hours):
        if hour["risk"] is None:
            continue  # the API needs a risk score; skip hours the model didn't score
        reading = {
            "timestamp": (start + timedelta(hours=hour["hour"])).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "heartRate": hour["heartRate"],
            "respRate": hour["respRate"],
            "tempC": hour["tempC"],
            "spo2": hour["spo2"],
            "risk": hour["risk"],
        }
        live = i >= args.backfill
        if live:
            time.sleep(args.every)
        status = post(args.url, reading)
        print("{} hour {:>3}  risk {:.2f}  -> {}".format("sent" if live else "backfilled", hour["hour"], hour["risk"], status))

    print("Done: sent all {} hours of {}.".format(len(hours), args.patient))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopped.")
