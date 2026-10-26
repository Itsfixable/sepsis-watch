# SepsisWatch

**A student research prototype with synthetic vital-sign demos and a separate retrospective ICU model experiment.** Congressional App Challenge 2026, Georgia's 7th district.

Visit [SepsisWatch](https://sepsis-watch.vercel.app/) or open **http://localhost:3000/about** after starting the app.
Navigation is labeled Overview (`/about`), Monitor (`/monitor`), and Timelines (`/replay`).
The root address (`/`) opens Overview. Timelines starts with Patient A at a key moment;
choose **Replay from start** to follow the whole scenario. The **Open detailed comparison**
link leads to `/replay/classic`, which includes the partial NEWS2 comparison and replay result.

Sepsis is a life-threatening response to an infection that can lead to organ damage.
The [CDC explains the warning signs and need for prompt medical care](https://www.cdc.gov/sepsis/about/index.html).
This project explores how to present changes in four vital signs and their history. The current
app demonstrates the interface; it does not establish earlier detection or improved outcomes.

> Monitor and Timelines use synthetic records and illustrative scores. The separate `/research`
> page evaluates an offline-trained model on real de-identified ICU records. Neither is live
> clinical monitoring. SepsisWatch is not validated for medical use; a low score must not delay help.

## What works today

```
Bundled synthetic JSON → browser demo → Monitor / Timelines

Local development only:
demo_pi.py → POST /api/readings → validation → temporary memory
                                                   ↓
                                    GET /api/readings → local Monitor
```

The demo scripts generate or replay illustrative values; they do not run the research model.
The public Monitor does not use the readings API. Each visitor gets a separate browser session.

A proposed bedside unit would use radar for heart and breathing rates, plus a pulse oximeter
and thermometer. Hardware integration and clinical evaluation remain future work.
The proposed oximeter and thermometer would require contact; this is not a contactless system.

### Separate research notebook

Open `/research` from Overview or Timelines to inspect a logistic-regression experiment with
four vitals and explicit missingness features. Training, validation and internal testing use
disjoint hospital A records; hospital B is an external test. The page reports errors and coverage,
not just successful examples. Its two held-out records have precomputed scores, no synthetic
warning bands, and no individual likelihood claims. Gemini is not enabled.

See [data/research/README.md](data/research/README.md) for the fixed protocol, source/license
notices, limitations and commands to reproduce the model, metrics and examples. Python and
scikit-learn are offline development dependencies; Vercel only renders exported JSON artifacts.

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

### Try the Demo Monitor (no hardware needed)

Open `/monitor`. Each visitor gets an independent synthetic stream: the first 24 observations
are shown immediately, followed by one simulated hour every three seconds. Choose a patient,
pause/resume, or reset the demo. Reset returns to the initial observations and pauses; the stream
stops at the end. Missing readings stay missing, and scores are illustrative, not validated predictions.

This works on Vercel without a running laptop, database, shared server state, or API submissions.
Refreshing starts a new session. Only synthetic records are included in this demonstration.

### Demonstrate the Python/API pipeline locally

The live API is **disabled by default**, always disabled in production builds and on Vercel,
and returns `403` for both GET and POST when disabled. To try the local-only sensor stand-in,
stop any existing dev server and start it with:

```bash
SEPSISWATCH_LOCAL_API=1 npm run dev -- --hostname 127.0.0.1
```

Then open a **second** Terminal window in the project folder and run:

```bash
python3 scripts/demo_pi.py --url http://127.0.0.1:3000
```

Open `http://127.0.0.1:3000/monitor` to see **Local API demonstration**. The sender posts the first
24 observations immediately, then one more every 10 seconds. This local page polls every 10 seconds.
Use only synthetic data. Press `Ctrl C` to stop the sender; restarting the server clears its memory.
This mode has no authentication: keep it bound to localhost and do not expose it through a tunnel.

### Watch a replay

Open **http://localhost:3000/replay**, pick a patient, and choose **Replay from start**.
Use the speed selector, chapter buttons or slider, and select a vital to inspect its trend.
The initial reference uses available readings from the first 12 hours, with at least three
measurements per vital. It is not an established healthy baseline.

**Open detailed comparison** leads to `/replay/classic`. Its result compares the first high
supplied score with simulated onset, or an onset derived from a research record if one is imported.
The bundled scenarios show interface behavior, not model accuracy.

### The partial NEWS2 comparison

The detailed replay sums four NEWS2 components: heart rate, respiratory rate, temperature and
oxygen saturation (scale 1). It omits blood pressure, consciousness or new confusion, and
supplemental oxygen use, so it is **not full clinical NEWS2**. See the
[Royal College of Physicians guidance](https://www.rcp.ac.uk/resources/national-early-warning-score-news-2/).
It carries the last available measurement forward for each vital; these inputs can be stale.
The demo uses a threshold of 5 for comparison only. Earlier crossings do not demonstrate clinical
benefit. A future model evaluation needs held-out records, missed-case and false-alarm reporting,
and appropriate clinical baselines.

## Part 3: Check that everything is correct

Before recording your video or submitting, run the checks below and review any failures.

```bash
npm run lint
```

**Lint** reads the code and points out mistakes and risky patterns.

Run `npm test` to check replay outcomes, missing observations, demo-session progression,
rendered components and API access controls. These are software checks, not clinical validation.

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

## Part 4: Explore the local API

See **[docs/API.md](docs/API.md)** for the JSON format and localhost examples. The Python
sender stands in for hardware. Production and Vercel reject both API methods; connecting a
remote sensor would require a separate authenticated, persistent ingestion service.

## Part 5: Optional research-record conversion

The legacy converter below is separate from the reproducible `/research` experiment described
in [data/research/README.md](data/research/README.md). It converts de-identified PhysioNet records
and independently supplied scores; it does not train or evaluate a model. Follow the dataset's
license and use requirements; do not upload private patient records.

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

   This writes `data/replays/p000009.json`. The Overview preview and `/replay/classic` load these
   records; rebuild a production deployment after adding files. The public `/replay` patient story
   and `/monitor` demo filter for synthetic records only. Keep the bundled synthetic scenarios
   available for those pages.

**How the onset hour is found:** in PhysioNet 2019, `SepsisLabel` switches to 1 six hours
*before* sepsis onset, so the script uses the first row with `SepsisLabel = 1`, plus 6. That
time is an inference from the challenge labels, not the time a doctor recognized sepsis.
If the first row is already positive, the true onset may be earlier; the converter prints a warning.
The detailed replay calls this "recorded onset". Treat lead-time claims with care at record boundaries.

Do not use selected examples as evidence of predictive accuracy. Report performance across a
held-out dataset, including missed cases and false alarms, before making model-performance claims.

## Part 6: Understand the demo thresholds

The supplied scores use these illustrative thresholds in `src/lib/thresholds.ts`:

```ts
export const RISK_THRESHOLDS = {
  yellow: 0.3,
  red: 0.6,
} as const;
```

These values demonstrate the interface and are not clinically selected cutoffs. The status
classification and replay result use this shared configuration; the patient-story chart currently
also displays 0.30 / 0.60 directly. If thresholds change, keep the chart labels and documentation
in sync. A future trained model would need separate threshold selection and evaluation.

---

## What each file does

### Pages and API (`src/app/`)

| File | What it does |
| ---- | ------------ |
| `src/app/layout.tsx` | The frame around every page: fonts, top bar, footer disclaimer, page title. |
| `src/app/providers.tsx` | Turns on TanStack Query, the library that fetches data and re-checks it every 10 seconds. |
| `src/app/globals.css` | The light clinical-workspace theme, responsive layouts, chart styles and playback controls. |
| `src/app/page.tsx` | Redirects the home address (`/`) to Overview (`/about`). |
| `src/app/monitor/page.tsx` | Shows the browser demo, or the explicitly enabled local-only API demonstration. |
| `src/app/replay/page.tsx` | Shows `PatientStory` with synthetic records. |
| `src/app/replay/classic/page.tsx` | Shows the detailed replay with the partial NEWS2 comparison. |
| `src/app/api/readings/route.ts` | Local-only API: validates/stores synthetic readings with `POST`, returns them with `GET`; both methods return 403 when disabled. |
| `src/app/favicon.ico` | The little icon in the browser tab. |

### Building blocks (`src/components/`)

| File | What it does |
| ---- | ------------ |
| `DemoMonitor.tsx` | Independent browser demo with 24 initial observations, timed progression, pause/resume and reset. |
| `LiveMonitor.tsx` | Local-only Python/API demonstration. Polls every 10 seconds and shows connection or delayed-reading messages. |
| `PatientStory.tsx` | Main Timelines view: synchronized panels, missing readings, initial references, vital trends and copyable observation summaries. |
| `ReplayPlayer.tsx` | Detailed comparison player: patient picker, playback, slider, speed, chart markers and result. |
| `StatusLight.tsx` | The early-warning panel: risk score, labeled status, threshold scale and guidance. Status is conveyed with both color and text. |
| `RiskChart.tsx` | Score chart with thresholds and caller-supplied markers. Onset labels distinguish synthetic and research records. |
| `VitalTiles.tsx` | The four number tiles: heart rate, breathing rate, temperature (°C and °F), SpO₂. |
| `DataTable.tsx` | The expandable "Recorded observations" table below the dashboard, with every hour's numbers. |
| `SiteHeader.tsx` | Navigation for Overview, Monitor and Timelines. |

### Logic and shared code (`src/lib/`)

| File | What it does |
| ---- | ------------ |
| `types.ts` | The shapes of all shared data (a reading, a replay file, and so on). |
| `demoMonitor.ts` | Bounded playback state and revealed-observation snapshots for the public demo. |
| `monitorMode.ts` | Enables ingestion only with the explicit local-development flag, never in production or on Vercel. |
| `patientStory.ts` | Initial-reference comparisons and summaries that preserve missing current values. |
| `news2.ts` | Partial four-vital comparison, carry-forward convention and demo threshold crossings. |
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
| `scripts/make_demo_data.py` | Re-creates the three synthetic demo patients. |
| `scripts/demo_pi.py` | Sends synthetic observations to the explicitly enabled local API demonstration. |
| `docs/API.md` | Local-only synthetic ingestion, with curl and Python examples. |

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

- **No demonstrated clinical benefit.** Illustrative scores are not probabilities, diagnoses or validated warnings. A low score does not mean someone is well.
- **Public demo, not live monitoring.** The public Monitor uses bundled synthetic observations in each browser; it does not accept readings or share state between visitors.
- **Local API has no database or authentication.** Explicitly enabled local development retains readings only in one server's memory. Keep it on localhost with synthetic data. It is disabled in production and on Vercel; a real hosted service would need persistent storage and authenticated access.
- **Research is not clinical validation.** The separate offline model is evaluated retrospectively on ICU data, not at home. Its outputs are uncalibrated, its false alerts and missed cases are reported, and it is not connected to live monitoring. Hardware integration and clinical evaluation remain future work.
- **Partial NEWS2 only.** The four-vital comparison omits required clinical inputs and can carry old measurements forward.

## Built with

[Next.js 16](https://nextjs.org) (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
[TanStack Query](https://tanstack.com/query) · [Recharts](https://recharts.github.io) ·
data format from the [PhysioNet/Computing in Cardiology Challenge 2019](https://physionet.org/content/challenge-2019/1.0.0/).
