# SepsisWatch

**A student prototype for visualizing sepsis risk, with a proposed radar-assisted bedside system.** Congressional App Challenge 2026, Georgia's 7th district.

Open **http://localhost:3000/about** for the product overview and an interactive timeline preview.
Navigation is labeled Overview (`/about`), Monitor (`/monitor`), and Timelines (`/replay`).
The root address (`/`) opens Timelines with Patient A selected. Choose **Start replay** to begin.
Timelines includes shortcuts to key moments and the final result.
Synthetic observations are labeled throughout and are not presented as sensor measurements.

About 1.7 million US adults get sepsis each year, and more than 350,000 of them die or are
discharged to hospice (CDC). Catching it early saves lives. SepsisWatch watches a patient's
vital signs without touching them and raises an **early warning** when the risk is rising, so
the care team can take a closer look sooner.

> SepsisWatch gives an early warning to support a clinician's judgment. It does not diagnose
> sepsis and is not a medical device.

## How the system fits together

```
 Bedside sensors                    Raspberry Pi Zero                 This web app (Next.js)
 ─────────────────                  ─────────────────                 ──────────────────────
 60 GHz mmWave radar ─ HR, RR ─┐
 Pulse oximeter ────── SpO2 ───┼──► collects one reading per hour ──► POST /api/readings
 Temperature probe ─── temp ───┘    + risk score from the model        │
                                    (PyTorch transformer, Python)     ▼
                                                                       Monitor page: live readings
                                                                       Replay page: past stays
```

The model stays in Python. The web app only **shows** its scores.

---

## Part 1: Run it on your Mac (first time)

You only do this part once.

### 1. Open Terminal

Press `⌘ Space`, type **Terminal**, press Return. Terminal is where you type commands.
Each command below goes on one line: paste it, then press Return.

### 2. Check that Node.js is installed

Node.js runs the web app. Check its version:

```bash
node -v
```

You need **v20.9 or newer** (for example `v24.15.0`). If it says `command not found`, download
the **LTS** installer from [nodejs.org](https://nodejs.org), run it, then close and reopen Terminal.

### 3. Go to the project folder

`cd` means "change directory" (move into a folder):

```bash
cd ~/Desktop/sepsisWatch
```

### 4. Install the project's libraries

```bash
npm install
```

This reads `package.json` and downloads everything the app needs (Next.js, React, Tailwind,
TanStack Query, Recharts) into a folder called `node_modules`. It takes a minute. You only need
to run it again if `package.json` changes.

## Part 2: Start the app

```bash
npm run dev
```

This starts the app in **development mode**. When you see `Ready`, open
**http://localhost:3000** in your browser. Leave this Terminal window open: closing it (or
pressing `Ctrl C`) stops the app. While it runs, saving any file updates the page automatically.

### See the live monitor fill in (no hardware needed)

The Monitor page (`/monitor`) starts empty because no readings have arrived yet. To pretend to be the Pi, open a
**second** Terminal window (`⌘ N`) and run:

```bash
cd ~/Desktop/sepsisWatch
python3 scripts/fake_pi.py
```

It sends the first 24 hours of demo Patient A right away, then one more hour every 10 seconds.
Watch the Monitor page: it checks for new readings every 10 seconds, so the light, tiles and chart
update on their own. Press `Ctrl C` to stop it. To start over with an empty monitor, stop and
restart `npm run dev`. Readings live only in memory.

### Watch a replay

Open **http://localhost:3000/replay**, pick a patient, choose 1x, 2x or 4x, and press play.
At the end it compares the first high score with simulated onset (synthetic scenarios) or recorded onset
(hospital records). Use the key-moment buttons to jump directly to a warning or the result.

## Part 3: Check that everything is correct

Before recording your video or submitting, run these. Both should finish with no errors.

```bash
npm run lint
```

**Lint** reads the code and points out mistakes and risky patterns.

Run `npm test` to check replay outcomes, source-specific wording, threshold boundaries,
and reading validation. Tests compile the domain modules in a temporary directory and clean up afterward.

```bash
npm run build
```

**Build** makes the fast, optimized production version and checks all the TypeScript types.

To run the production version after building:

```bash
npm start
```

### Open it on your phone

Your phone and Mac must be on the same Wi-Fi.

1. Run `npm run build`, then `npm start`. (Use these rather than `npm run dev`. In development
   mode, Next.js blocks other devices from loading the page's scripts.)
2. Find your Mac's address:

   ```bash
   ipconfig getifaddr en0
   ```

3. On your phone, open `http://THAT-ADDRESS:3000` (for example `http://192.168.1.23:3000`).
   If macOS asks whether "node" may accept incoming connections, click **Allow**.

## Part 4: Connect the Raspberry Pi

See **[docs/API.md](docs/API.md)**. It has the exact JSON format plus curl and Python examples
the Pi can copy.

## Part 5: Add real patients to the Replay page

Until your model is trained, the Replay page shows three **synthetic** (made-up) patients,
clearly labeled "Synthetic data". To replace them with real ones:

1. Download the PhysioNet 2019 Challenge data from
   [physionet.org/content/challenge-2019](https://physionet.org/content/challenge-2019/1.0.0/).
   Each patient is one `.psv` file, like `training_setA/p000009.psv`.
2. Have your model write its hourly scores for that patient to a CSV file like this
   (`hour` counts rows of the `.psv` file, starting at 0):

   ```
   hour,risk
   0,0.031
   1,0.035
   ```

3. Convert both into a replay file:

   ```bash
   python3 scripts/physionet_to_replay.py path/to/p000009.psv path/to/p000009_scores.csv --label "Patient 1"
   ```

   This writes `data/replays/p000009.json`. Refresh the Replay page and it appears in the picker.
4. To remove the synthetic patients, delete `data/replays/patient-a.json`, `patient-b.json` and
   `patient-c.json`.

**How the onset hour is found:** in PhysioNet 2019, `SepsisLabel` switches to 1 six hours
*before* sepsis onset, so the script uses the first row with `SepsisLabel = 1`, plus 6. That
onset time comes from the hospital record (when infection was suspected and organ function
worsened, under the Sepsis-3 definition). The Replay page calls this "recorded onset";
it does not claim that it is the time a doctor recognized sepsis.

Pick replay patients honestly. A patient where the warning came late or not at all, or a false
alarm, shows judges you understand the model's limits, and the Replay page reports those cases
plainly.

## Part 6: Tune the warning thresholds

Open `src/lib/thresholds.ts` and change these two numbers:

```ts
export const RISK_THRESHOLDS = {
  yellow: 0.3,
  red: 0.6,
} as const;
```

The status light, the chart's threshold lines and the replay result all read from this one
file. Choose the numbers from your validation results after training: a lower red threshold
catches sepsis earlier but raises more false alarms.

---

## What each file does

### Pages and API (`src/app/`)

| File | What it does |
| ---- | ------------ |
| `src/app/layout.tsx` | The frame around every page: fonts, top bar, footer disclaimer, page title. |
| `src/app/providers.tsx` | Turns on TanStack Query, the library that fetches data and re-checks it every 10 seconds. |
| `src/app/globals.css` | The light clinical-workspace theme, responsive layouts, chart styles and playback controls. |
| `src/app/page.tsx` | Redirects the home address (`/`) to the patient timelines. |
| `src/app/monitor/page.tsx` | The live monitor (`/monitor`). Shows the `LiveMonitor` component. |
| `src/app/replay/page.tsx` | The replay page (`/replay`). Reads the replay files on the server and passes them to the player. |
| `src/app/api/readings/route.ts` | The API. `POST` stores a reading from the Pi; `GET` returns all readings. |
| `src/app/favicon.ico` | The little icon in the browser tab. |

### Building blocks (`src/components/`)

| File | What it does |
| ---- | ------------ |
| `LiveMonitor.tsx` | The live monitor. Asks the API for readings every 10 seconds; shows the light, chart and tiles; warns if the Pi goes quiet for 90 minutes or the server can't be reached. |
| `ReplayPlayer.tsx` | The replay page player: patient picker, play/pause, slider, 1x/2x/4x speed, chart markers and the end-of-replay result. |
| `StatusLight.tsx` | The early-warning panel: risk score, labeled status, threshold scale and guidance. Status is conveyed with both color and text. |
| `RiskChart.tsx` | The risk-score line chart with the threshold lines and the "turned red" / "sepsis recognized" markers. |
| `VitalTiles.tsx` | The four number tiles: heart rate, breathing rate, temperature (°C and °F), SpO₂. |
| `DataTable.tsx` | The expandable "Recorded observations" table below the dashboard, with every hour's numbers. |
| `SiteHeader.tsx` | The top bar with the SepsisWatch name and the Monitor / Replay links. |

### Logic and shared code (`src/lib/`)

| File | What it does |
| ---- | ------------ |
| `types.ts` | The shapes of all shared data (a reading, a replay file, and so on). |
| `thresholds.ts` | **The yellow and red thresholds** and the words shown for each level. Tune here. |
| `validateReading.ts` | Checks every reading the Pi sends and explains exactly what is wrong if it is rejected. |
| `readingsStore.ts` | Keeps readings in the server's memory (no database yet). |
| `replays.ts` | Loads and checks the JSON files in `data/replays/`. |
| `replaySummary.ts` | Finds the hour the light first turned red and writes the end-of-replay sentence. |
| `vitals.ts` | Labels, units and typical ranges for the four vital signs, plus small helpers. |

### Data, scripts and docs

| File | What it does |
| ---- | ------------ |
| `data/replays/*.json` | One file per replay patient. The three included patients are synthetic. |
| `scripts/physionet_to_replay.py` | Turns a PhysioNet 2019 `.psv` file + your model's score CSV into a replay file. |
| `scripts/make_fake_replays.py` | Re-creates the three synthetic demo patients. |
| `scripts/fake_pi.py` | Pretends to be the Raspberry Pi so you can test the live monitor without hardware. |
| `docs/API.md` | How the Pi talks to the API, with curl and Python examples. |

The Python scripts use only Python's built-in libraries, so there is nothing extra to install.

### Project settings (you rarely need to touch these)

| File | What it does |
| ---- | ------------ |
| `package.json` | The project's name, its libraries and the `npm run …` commands. |
| `package-lock.json` | The exact library versions, so every computer installs the same thing. Don't edit by hand. |
| `tsconfig.json` | TypeScript settings. `@/` in imports means the `src/` folder. |
| `next.config.ts` | Next.js settings (empty for now). |
| `eslint.config.mjs` | Rules that `npm run lint` checks. |
| `postcss.config.mjs` | Connects Tailwind CSS to the build. |
| `next-env.d.ts` | Generated by Next.js for TypeScript. Don't edit. |
| `AGENTS.md`, `CLAUDE.md` | Notes for AI coding assistants about this Next.js version. |
| `.gitignore` | Files git should not save (like `node_modules`). |

## Limitations (good to say in your video)

- **Early warning, not diagnosis.** The light means "look closer," never "this patient has sepsis."
- **No database yet.** Live readings are lost when the server restarts.
- **One server only.** Readings are kept in one computer's memory, so this runs on a laptop,
  not on hosting that runs many copies (like Vercel) until a database is added.
- **No login on the API.** Fine on your own Wi-Fi for the demo; add a secret key before going online.
- **Synthetic replays** are labeled as such until real PhysioNet records and model scores are added.

## Built with

[Next.js 16](https://nextjs.org) (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
[TanStack Query](https://tanstack.com/query) · [Recharts](https://recharts.github.io) ·
data format from the [PhysioNet/Computing in Cardiology Challenge 2019](https://physionet.org/content/challenge-2019/1.0.0/).
