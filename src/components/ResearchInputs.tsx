import { useId, useState } from "react";
import { researchInputHistory, researchInputTrace, type researchInputExamples, type ResearchVitalKey } from "@/lib/researchInputs";
import type { ReplayHour } from "@/lib/types";
import styles from "./ResearchExplorer.module.css";

export function ResearchInputs({ visible, imputation, scoreAvailable, examples = [], index, onIndexChange }: {
  visible: ReplayHour[]; imputation: number[]; scoreAvailable: boolean;
  examples?: ReturnType<typeof researchInputExamples>; index?: number; onIndexChange?: (index: number) => void;
}) {
  const heading = useId();
  const vitalGroup = useId();
  const [selectedVital, setSelectedVital] = useState<ResearchVitalKey>("tempC");
  const trace = researchInputTrace(visible, imputation);
  const inspection = researchInputHistory(visible, imputation, selectedVital, scoreAvailable);
  const used = trace.scorable && scoreAvailable;
  const temperature = trace.rows.find(row => row.key === "tempC");
  const hour = visible.at(-1)?.hour;
  const explanation = !used || !temperature ? "No published score at this hour. No model inputs are shown as used."
    : temperature.source === "current" ? `Hour ${hour}: temperature is recorded as ${temperature.value} °C. The model uses this current measurement.`
    : temperature.source === "earlier" ? `Hour ${hour}: no current temperature. The model uses ${temperature.value} °C from hour ${temperature.observedHour}, ${temperature.age} h earlier.`
    : `Hour ${hour}: no usable recent temperature. The model substitutes ${temperature.value} °C from the training set, not from this patient.`;
  return <section className={styles.inputSection} aria-labelledby={heading}>
    <div className={styles.inputHeading}><div><p className={styles.eyebrow}>Input transparency · Hour {visible.at(-1)?.hour}</p>
      <h4 id={heading}>What the model used</h4></div><span className={styles.inputStatus}>{used ? "Before standardization" : "No published score"}</span></div>
    {examples.length > 0 && onIndexChange && <div className={styles.walkthrough}>
      <h5>Temperature walkthrough</h5>
      <p>Retrospective shortcuts to examples in this record. Each choice moves the shared hour; the model input view uses only observations up to that hour.</p>
      <div className={styles.walkthroughSteps} role="group" aria-label="Temperature input examples">
        {examples.map(example => <button key={example.source} type="button" aria-current={example.index === index ? "step" : undefined}
          onClick={() => { setSelectedVital("tempC"); onIndexChange(example.index); }}>
          <span>{example.source === "median" ? "Training substitute" : example.source === "current" ? "Current measurement" : "Earlier reading"}</span>
          <small>Hour {example.index}</small>
        </button>)}
      </div>
      <p className={styles.walkthroughResult} role="status">{explanation}</p>
    </div>}
    <p className={styles.inputIntro}>{used
      ? "Follow a measurement into the model. Select a vital to inspect its recent observations and the input used at this hour."
      : "No inputs used for a published score. When all four vitals are unavailable or over six hours old, the pipeline withholds the score."}</p>
    {inspection && <div className={styles.inspector}>
      <fieldset className={styles.vitalSelector}><legend>Follow one input</legend>
        <div>{trace.rows.map(row => <label key={row.key} className={styles.vitalChoice}>
          <input type="radio" name={vitalGroup} value={row.key} checked={selectedVital === row.key}
            onChange={() => setSelectedVital(row.key)} />
          <span>{row.label}</span>
        </label>)}</div>
      </fieldset>
      <div className={styles.inputJourney}>
        <div className={styles.measurementHistory}>
          <div className={styles.historyHeading}><h5>{inspection.row.label} observations</h5><span>Through hour {hour}</span></div>
          <p>Up to eight recent hours. Dashes are gaps, not zeroes. Only readings at most six hours old can carry forward.</p>
          <ol className={styles.historyRail} aria-label={`${inspection.row.label} measurement history`}>
            {inspection.history.map(item => <li key={item.hour} className={`${styles.historyPoint} ${item.usedByModel ? styles.sourcePoint : ""} ${item.value === null ? styles.missingPoint : ""}`}>
              <span className={styles.historyHour}>h{item.hour}{item.isCurrent && <small>Now</small>}</span>
              <strong>{item.value === null ? "—" : item.value}</strong>
              <span className={styles.historyState}>{item.usedByModel ? "Used by model" : item.excluded ? "Excluded" : item.value === null ? "Not recorded" : item.expired ? "Expired" : "Recorded"}</span>
            </li>)}
          </ol>
          <p className={styles.historyUnit}>All measurements in {inspection.row.unit}. {!inspection.used
            ? "No observation is highlighted because no score was published."
            : inspection.row.observedHour !== null && inspection.row.age !== null && inspection.row.age > 6
            ? `Last valid observation: hour ${inspection.row.observedHour}, ${inspection.row.age} h ago. It exceeds the carry-forward limit.`
            : "The highlighted observation supplies the model value. A substitute has no highlighted observation."}</p>
        </div>
        <div className={styles.inputOutcome} aria-live="polite" aria-atomic="true">
          <p className={styles.outcomeLabel}>Model input at hour {hour}</p>
          <span className={styles.sourceLabel}>{!inspection.used ? "No published score" : inspection.row.source === "median" ? "Training-set median" : inspection.row.source === "earlier" ? "Earlier reading" : "Current reading"}</span>
          <p className={styles.outcomeValue}>{inspection.valueUsed === null ? "—" : inspection.valueUsed}<small>{inspection.row.unit}</small></p>
          <p>{!inspection.used ? "Not used. The history remains visible for inspection."
            : inspection.row.source === "median" ? "Substitute from training records. No usable recent measurement for this vital."
            : inspection.row.source === "earlier" ? `From hour ${inspection.row.observedHour} · ${inspection.row.age} h old. Not measured this hour.`
            : "Measured at the selected hour. No substitute needed."}</p>
          <dl className={styles.inputCodes}><div><dt>Age code</dt><dd>{inspection.used ? inspection.row.ageInput : "—"}</dd></div><div><dt>Measured now</dt><dd>{inspection.used ? inspection.row.currentInput === 1 ? "Yes · 1" : "No · 0" : "—"}</dd></div></dl>
          {inspection.used && inspection.row.source === "median" && <p className={styles.ageHelp}>Age code 7 means unavailable or expired, not a measured age.</p>}
        </div>
      </div>
    </div>}
    <details className={styles.allInputs}><summary>All four input sources</summary><div className={styles.inputRows}>{trace.rows.map(row => <article className={styles.inputRow} key={row.key}>
      <h5>{row.label}</h5><dl>
        <div><dt>Recorded this hour</dt><dd>{row.current === null ? "Not recorded" : <>{row.current} <small>{row.unit}</small></>}</dd></div>
        <div><dt>Value used by model</dt><dd>{used ? <>{row.value} <small>{row.unit}</small></> : "Not used"}</dd></div>
        <div><dt>Input source</dt><dd className={used && row.source === "median" ? styles.imputed : undefined}>{!used ? "No score" : row.source === "current" ? "Current reading" : row.source === "earlier" ? "Earlier reading" : "Training-set median"}</dd></div>
        <div><dt>Last valid observation</dt><dd>{row.observedHour === null ? "None so far" : <>h{row.observedHour} · {row.age === 0 ? "this hour" : `${row.age} h ago`}{row.age !== null && row.age > 6 ? " (expired)" : ""}</>}</dd></div>
      </dl>
    </article>)}</div></details>
    <p className={styles.inputFootnote}>A training-set median is a substitute learned from training records, not a measurement from this patient. This view traces inputs; it does not explain what caused sepsis or which input caused the score.</p>
    {used && <details className={styles.inputDetails}><summary>Inspect the 12 inputs before scaling</summary>
      <p>Each vital contributes a value, an age code and a current-hour flag. Age code 7 means unavailable or expired, not necessarily a seven-hour-old reading. Flag 1 means measured this hour; 0 means not measured. The model then applies training-set standardization.</p>
      <dl>{trace.rows.map(row => <div key={row.key}><dt>{row.feature} · value / age code / current flag</dt><dd>{row.value} / {row.ageInput} / {row.currentInput}</dd></div>)}</dl>
    </details>}
  </section>;
}
