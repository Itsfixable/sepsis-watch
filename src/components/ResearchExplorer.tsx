"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { earlierObservationContext } from "@/lib/patientStory";
import { researchSnapshot, type ResearchRecord } from "@/lib/research";
import styles from "./ResearchExplorer.module.css";

const decimal = (value: number | null, digits = 2) => value === null ? "—" : value.toFixed(digits);
const exact = (value: number | null) => value === null ? "—" : String(value);

export function ResearchExplorer({ records, threshold }: { records: ResearchRecord[]; threshold: number | null }) {
  const [selected, setSelected] = useState(0);
  if (!records.length) return <p>No research records available.</p>;
  return <section className={styles.section} aria-labelledby="records-title">
    <div className={styles.sectionHead}><div><p className={styles.eyebrow}>02 / Inspect the evidence</p><h2 id="records-title">Two held-out records.</h2>
      <p>Real, de-identified ICU observations. Selected by record ID before model results were known—not chosen for successful predictions.</p></div>
      <label className={styles.picker}>Choose a record<select value={selected} onChange={event => setSelected(Number(event.target.value))}>
        {records.map((record, index) => <option key={record.id} value={index}>{record.label} · {record.id}</option>)}
      </select></label></div>
    <SelectedRecord key={records[selected].id} record={records[selected]} threshold={threshold} />
  </section>;
}

function SelectedRecord({ record, threshold }: { record: ResearchRecord; threshold: number | null }) {
  const [index, setIndex] = useState(0);
  return <ResearchRecordView record={record} index={index} onIndexChange={setIndex} threshold={threshold} />;
}

export function ResearchRecordView({ record, index, onIndexChange, threshold }: {
  record: ResearchRecord; index: number; onIndexChange: (index: number) => void; threshold: number | null;
}) {
  const state = researchSnapshot(record, index);
  if (!state) return <p>No observations available.</p>;
  const { current, visible, snapshot, summary } = state;
  return <div className={styles.explorer}>
    <div className={styles.recordHead}><div><span className={styles.tag}>PhysioNet 2019 · held-out hospital A</span>
      <h3>{record.label}</h3><p>{record.id} · Precomputed, offline model output · Hours since first recorded row</p></div>
      <div className={styles.hour} aria-live="polite">Hour {current.hour} of {record.hours.length - 1}</div></div>
    <div className={styles.controls}>
      <button type="button" onClick={() => onIndexChange(current.hour - 1)} disabled={current.hour === 0} aria-label="Previous research hour">Previous</button>
      <input type="range" aria-label="Research hour" aria-valuetext={`Hour ${current.hour} of ${record.hours.length - 1}`} min={0} max={record.hours.length - 1} value={current.hour} onChange={event => onIndexChange(Number(event.target.value))} />
      <button type="button" onClick={() => onIndexChange(current.hour + 1)} disabled={current.hour === record.hours.length - 1} aria-label="Next research hour">Next</button>
    </div>
    <div className={styles.scoreLayout}>
      <div className={styles.score}><p className={styles.eyebrow}>Experimental model score</p><strong>{current.risk === null ? "No score" : current.risk.toFixed(3)}</strong>
        <p>{current.risk === null ? "No recent usable vital signs for this hour." : "An uncalibrated research output—not an individual's likelihood of sepsis."}</p>
        <p>Locked evaluation threshold: {threshold === null ? "not selected" : threshold.toFixed(2)}. No clinical warning bands are applied here.</p></div>
      <div className={styles.chart} role="img" aria-label={`Experimental score through hour ${current.hour}. Exact values are in the observations table below.`}>
        <ResponsiveContainer width="100%" height="100%" minHeight={220}>
          <LineChart data={visible} margin={{ top: 16, right: 22, left: -14, bottom: 12 }}>
            <CartesianGrid stroke="#e3ebe5" vertical={false} /><XAxis dataKey="hour" type="number" domain={[0, Math.max(current.hour, 1)]} allowDecimals={false} tick={{ fontSize: 12 }} tickFormatter={hour => `h${hour}`} />
            <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} width={48} /><Tooltip labelFormatter={hour => `Hour ${hour}`} />
            {threshold !== null && <ReferenceLine y={threshold} stroke="#718277" strokeDasharray="5 5" />}
            <Line name="Experimental score" type="linear" dataKey="risk" stroke="#23664c" strokeWidth={2.5} dot={visible.length === 1 ? { r: 4 } : false} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
    <div className={styles.vitals}>{snapshot.observations.map(item => <article key={item.key}>
      <h4>{item.label}</h4><p className={styles.measurement}>{decimal(item.current, item.decimals)} <small>{item.unit}</small></p>
      <p>{item.current === null ? "Not recorded this hour" : "Recorded this hour"}</p>
      {item.current === null ? <p className={styles.context}>{earlierObservationContext(item, current.hour)}</p>
        : <p className={styles.context}>{item.reference === null ? snapshot.referenceComplete ? "Not enough initial readings to compare." : "Initial reference still building." : `Initial reference ${decimal(item.reference, item.decimals)} ${item.unit}.`}</p>}
    </article>)}</div>
    <div className={styles.notes}>
      <details><summary>Read the observation summary</summary><p className={styles.summary}>{summary}</p><p>This is a deterministic summary of recorded values, not an LLM assessment. The initial-reference comparison is separate from the trained model.</p></details>
      <details><summary>How missing readings affect this score</summary><p>The model can use the latest valid reading for up to six hours, along with its age and whether it was measured this hour. Older or never-recorded values use a training-set median. When all four readings are unavailable or over six hours old, there is no score. The tiles always distinguish current from earlier measurements.</p></details>
      <details><summary>Retrospective outcome — not an input to the model</summary><p>{record.inferredOnsetHour === null
        ? "This record has no positive sepsis label. Its final six hours are omitted because future follow-up is insufficient. This is not evidence of health after discharge."
        : `The dataset's label implies onset at hour ${record.inferredOnsetHour}. Only earlier hours are shown; positive target labels cover the six hours preceding that onset. This outcome was not used as a model input.`}</p></details>
      <details><summary>Exact observations revealed so far ({visible.length})</summary><div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Revealed observations, scroll horizontally if needed"><table>
        <caption>Current-hour measurements; a dash means not recorded. The score may use earlier values as described above.</caption>
        <thead><tr><th scope="col">Hour</th><th scope="col">HR · bpm</th><th scope="col">Breaths/min</th><th scope="col">Temp · °C</th><th scope="col">SpO₂ · %</th><th scope="col">Score</th></tr></thead>
        <tbody>{visible.map(row => <tr key={row.hour}><th scope="row">Hour {row.hour}</th><td>{exact(row.heartRate)}</td><td>{exact(row.respRate)}</td><td>{exact(row.tempC)}</td><td>{exact(row.spo2)}</td><td>{exact(row.risk)}</td></tr>)}</tbody>
      </table></div></details>
    </div>
  </div>;
}
