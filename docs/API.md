# SepsisWatch API

This is a **local-only synthetic-data demonstration**, using a Python script as
a sensor stand-in. No hardware or trained model is required. Do not send real patient data.
The public Monitor streams bundled synthetic records independently in each browser.

- **POST `/api/readings`**: store one hourly reading
- **GET `/api/readings`**: get every reading stored so far, oldest first

The API is disabled by default. Both methods return `403 Forbidden` unless explicitly
enabled in local development. Production builds and Vercel always reject access, even
when the local flag is set. Local readings are kept in server memory and disappear
when the server restarts (there is no database or authentication).

## Enable the local demonstration

From the project folder, run:

```bash
SEPSISWATCH_LOCAL_API=1 npm run dev -- --hostname 127.0.0.1
```

Open `http://127.0.0.1:3000/monitor`. It should say **Local API demonstration**.
Keep this unauthenticated server bound to localhost; do not expose it on Wi-Fi or through
a public tunnel. If Next selects another port, use that port in the sender's `--url`.
Stop the server and restart without the flag to return to the browser-only demo.

## POST /api/readings

Send one JSON object with **all six fields**:

| Field       | Type             | Meaning                                         | Accepted range |
| ----------- | ---------------- | ----------------------------------------------- | -------------- |
| `timestamp` | string           | When the reading was taken, ISO 8601 with a time zone | e.g. `"2026-10-01T14:00:00Z"` |
| `heartRate` | number or `null` | Heart rate, beats per minute (radar)            | 20 – 250       |
| `respRate`  | number or `null` | Breathing rate, breaths per minute (radar)      | 2 – 80         |
| `tempC`     | number or `null` | Temperature, °C (probe)                         | 25 – 45        |
| `spo2`      | number or `null` | Blood oxygen, % (pulse oximeter)                | 50 – 100       |
| `risk`      | number           | Model risk score for this hour                  | 0 – 1          |

- Use `null` for a vital when that sensor had no reading. Don't leave the field out.
- `risk` is required. The dashboard is built around the score.
- Field names are case-sensitive (`heartRate`, not `heart_rate`). Unknown fields are rejected so typos get caught.
- Sending the same `timestamp` again **replaces** that hour instead of adding a duplicate, so it is safe to retry after a network error.

### Responses

| Status | Meaning |
| ------ | ------- |
| `201 Created` | New hour stored. |
| `200 OK` | An hour with the same timestamp already existed and was replaced. |
| `400 Bad Request` | Something was wrong. The body says exactly what. |
| `403 Forbidden` | Live readings are disabled; use the browser demo or explicitly enabled local development. |

Successful response:

```json
{
  "reading": {
    "timestamp": "2026-10-01T14:00:00.000Z",
    "heartRate": 92,
    "respRate": 19,
    "tempC": 37.6,
    "spo2": 96,
    "risk": 0.27,
    "receivedAt": "2026-10-01T14:00:03.512Z"
  },
  "replaced": false,
  "count": 12
}
```

Error response (`400`):

```json
{
  "error": "Reading rejected.",
  "details": [
    "\"risk\" must be between 0 and 1 (got 1.5).",
    "\"heartRate\" is missing. Send null if the sensor had no reading."
  ]
}
```

### Example: curl (Terminal)

```bash
curl -X POST http://127.0.0.1:3000/api/readings \
  -H "Content-Type: application/json" \
  -d '{"timestamp":"2026-10-01T14:00:00Z","heartRate":92,"respRate":19,"tempC":37.6,"spo2":96,"risk":0.27}'
```

### Example: local Python sender (no extra packages)

This uses only Python's built-in libraries. Run it on the same computer as the local server.

```python
import json
import urllib.error
import urllib.request
from datetime import datetime, timezone

DASHBOARD = "http://127.0.0.1:3000"


def send_reading(heart_rate, resp_rate, temp_c, spo2, risk):
    """Send one hourly reading. Pass None for a sensor that had no reading."""
    reading = {
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "heartRate": heart_rate,
        "respRate": resp_rate,
        "tempC": temp_c,
        "spo2": spo2,
        "risk": risk,
    }
    request = urllib.request.Request(
        DASHBOARD + "/api/readings",
        data=json.dumps(reading).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            print("Sent:", response.status)
            return True
    except urllib.error.HTTPError as error:
        # The dashboard answered but rejected the reading. Print why.
        print("Rejected:", error.code, error.read().decode())
    except urllib.error.URLError as error:
        print("Could not reach the dashboard:", error.reason)
    return False


send_reading(heart_rate=92, resp_rate=19, temp_c=37.6, spo2=96, risk=0.27)
```

### Example: Python with `requests`

If you already have `requests` installed locally:

```python
from datetime import datetime, timezone
import requests

DASHBOARD = "http://127.0.0.1:3000"

reading = {
    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "heartRate": 92,
    "respRate": 19,
    "tempC": 37.6,
    "spo2": None,  # pulse oximeter had no reading this hour
    "risk": 0.27,
}

response = requests.post(DASHBOARD + "/api/readings", json=reading, timeout=10)
print(response.status_code, response.json())
```

## GET /api/readings

Returns every stored reading, oldest first. Each one includes `receivedAt`,
the time the server got it. The Monitor page (`/monitor`) uses that to warn when the Pi has
gone quiet.

```bash
curl http://localhost:3000/api/readings
```

```json
{
  "readings": [
    {
      "timestamp": "2026-10-01T14:00:00.000Z",
      "heartRate": 92,
      "respRate": 19,
      "tempC": 37.6,
      "spo2": 96,
      "risk": 0.27,
      "receivedAt": "2026-10-01T14:00:03.512Z"
    }
  ]
}
```

## Testing without the Pi

`scripts/demo_pi.py` stands in for the proposed sensor. With local API mode enabled
as above, open a second Terminal window in the project folder and run:

```bash
python3 scripts/demo_pi.py --url http://127.0.0.1:3000
```

## Not a hosted ingestion service

The local flag is a development switch, not authentication. A real remote sensor service
would need authenticated access, durable storage and additional privacy/security review.
The public site deliberately does not offer that service.
