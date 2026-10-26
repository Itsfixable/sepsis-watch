# SepsisWatch API

The Raspberry Pi sends one reading per hour to the dashboard. This page shows
exactly what to send and gives examples you can copy.

- **POST `/api/readings`**: store one hourly reading
- **GET `/api/readings`**: get every reading stored so far, oldest first

Readings are kept in the server's memory. They disappear when the server
restarts (there is no database yet).

## Finding the dashboard's address

The Pi needs the address of the computer running SepsisWatch.

1. On the Mac, start the dashboard: `npm run dev` (or `npm start` after `npm run build`).
2. Find the Mac's Wi-Fi address:

   ```bash
   ipconfig getifaddr en0
   ```

   It prints something like `192.168.1.23`.
3. The dashboard address is then `http://192.168.1.23:3000`. The Pi and the Mac
   must be on the same Wi-Fi network. The first time, macOS may ask whether
   "node" can accept incoming connections. Click **Allow**.

In the examples below, replace `192.168.1.23` with your Mac's address. On the
Mac itself you can use `http://localhost:3000` instead.

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
curl -X POST http://192.168.1.23:3000/api/readings \
  -H "Content-Type: application/json" \
  -d '{"timestamp":"2026-10-01T14:00:00Z","heartRate":92,"respRate":19,"tempC":37.6,"spo2":96,"risk":0.27}'
```

### Example: Python on the Pi (no extra packages)

This uses only Python's built-in libraries, so it runs on a fresh Raspberry Pi OS.

```python
import json
import urllib.error
import urllib.request
from datetime import datetime, timezone

DASHBOARD = "http://192.168.1.23:3000"  # your Mac's address


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

If you have already installed `requests` on the Pi (`pip install requests`):

```python
from datetime import datetime, timezone
import requests

DASHBOARD = "http://192.168.1.23:3000"

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

`scripts/fake_pi.py` pretends to be the Pi. It sends a demo patient's hours
to the API. With `npm run dev` running, open a second Terminal window in the
`sepsisWatch` folder and run:

```bash
python3 scripts/fake_pi.py
```

## Before using this outside your own Wi-Fi

This API has no password, so anyone who can reach it can add readings. That
is fine on a home or school network for the demo. Add a shared secret key
(and HTTPS) before putting it on the public internet.
