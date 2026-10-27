"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceDot, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { RiskStroke } from "./RiskStroke";
import { Icon, type IconName } from "./Icon";
import type { ReplayRecord, VitalKey } from "@/lib/types";
import { patientSnapshot, observationDescription, observationSummary, earlierObservationContext, formatObservationValue as display } from "@/lib/patientStory";
import { riskLevel, RISK_THRESHOLDS } from "@/lib/thresholds";
import styles from "./PatientStory.module.css";

const ICONS: Record<VitalKey, IconName> = {
  heartRate: "activity", respRate: "breathing", tempC: "temperature", spo2: "oxygen",
};
const SCORE_LABELS = { none: "No score", green: "Low illustrative score", yellow: "Elevated illustrative score", red: "High illustrative score" };
const signed = (value: number) => `${value > 0 ? "+" : ""}${display(value)}`;

export function PatientStory({ replays }: { replays: ReplayRecord[] }) {
  const [selected, setSelected] = useState(replays.find((record) => record.id === "patient-a")?.id ?? replays[0]?.id);
  const record = replays.find((item) => item.id === selected);
  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}><Link href="/replay">Timelines</Link><span>/</span><span>Patient story</span><span className={styles.prototype}>Patient story</span></div>
      <header className={styles.heading}>
        <div><p className={styles.eyebrow}>SEPSISWATCH / PATIENT STORY</p><h1>Changes, in context.</h1><p>One moment in time. The readings, the trend, and what changed.</p></div>
        <div className={styles.demoNote}><Icon name="info" size={17} /><div><strong>Simulated scenarios</strong><span>Illustrative scores. Not for clinical use.</span></div></div>
      </header>
      {!record ? <div className={styles.empty}><h2>No patient scenarios available</h2><p>Add a simulated replay record to explore this prototype.</p><Link href="/replay">Back to timelines</Link></div> : <>
        <fieldset className={styles.patients}>
          <legend className={styles.srOnly}>Choose a simulated patient</legend>
          {replays.map((item, index) => <label key={item.id} className={styles.patientChoice}>
            <input type="radio" name="story-patient" checked={item.id === selected} onChange={() => setSelected(item.id)} />
            <span className={styles.patientLetter} aria-hidden="true">{String.fromCharCode(65 + index)}</span>
            <span><strong>{item.label.split(" · ")[0]}</strong><small>{item.label.split(" · ")[1] ?? "Simulated record"}</small></span>
            <span className={styles.selectedCheck}><Icon name="check" size={15} /></span>
          </label>)}
        </fieldset>
        <Story key={record.id} record={record} />
      </>}
    </div>
  );
}

function Story({ record }: { record: ReplayRecord }) {
  const riskStrokeId = useId();
  const firstHigh = record.hours.findIndex((hour) => hour.risk !== null && hour.risk >= RISK_THRESHOLDS.red);
  const [index, setIndex] = useState(firstHigh < 0 ? Math.min(12, record.hours.length - 1) : firstHigh);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [focus, setFocus] = useState<VitalKey | "risk">("risk");
  const [inspectionRequest, setInspectionRequest] = useState(0);
  const [copyStatus, setCopyStatus] = useState("");
  const trendRef = useRef<HTMLElement>(null);
  const lastIndex = record.hours.length - 1;
  const snapshot = patientSnapshot(record.hours, index);

  useEffect(() => {
    if (!playing || index >= lastIndex) return;
    const timer = window.setTimeout(() => {
      setIndex(index + 1);
      if (index + 1 >= lastIndex) setPlaying(false);
    }, 1200 / speed);
    return () => window.clearTimeout(timer);
  }, [playing, index, lastIndex, speed]);

  useEffect(() => {
    if (inspectionRequest === 0) return;
    // Focus after the chart heading updates, including repeated inspection of the same vital.
    trendRef.current?.focus({ preventScroll: true });
    trendRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [inspectionRequest]);

  if (!snapshot) return <div className={styles.empty}>This record has no observations.</div>;
  const hour = record.hours[index];
  const visible = record.hours.slice(0, index + 1);
  const level = riskLevel(hour.risk);
  const focused = snapshot.observations.find((item) => item.key === focus);
  const firstHour = record.hours[0].hour;
  const lastHour = record.hours[lastIndex].hour;
  const firstElevated = record.hours.findIndex((item) => item.risk !== null && item.risk >= RISK_THRESHOLDS.yellow);
  const referenceIndex = record.hours.findIndex((item) => item.hour >= firstHour + 12);
  const summary = observationSummary(record, index);
  const changed = snapshot.observations.filter((item) => item.delta !== null && item.delta !== 0);
  const missing = snapshot.observations.filter((item) => item.current === null);
  const moments = [
    { label: "Beginning", index: 0, number: "01" },
    ...(referenceIndex >= 0 ? [{ label: "First 12 hours", index: referenceIndex, number: "02" }] : []),
    ...(firstElevated >= 0 ? [{ label: "Elevated score", index: firstElevated, number: "03" }] : []),
    ...(firstHigh >= 0 ? [{ label: "High score", index: firstHigh, number: "04" }] : []),
  ].sort((a, b) => a.index - b.index).map((moment, position) => ({ ...moment, number: String(position + 1).padStart(2, "0") }));
  function seek(next: number) { setPlaying(false); setIndex(next); setCopyStatus(""); }
  function inspect(key: VitalKey) {
    setFocus(key);
    setInspectionRequest((request) => request + 1);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(summary); setCopyStatus("Summary copied."); }
    catch { setCopyStatus("Copy is unavailable. Open “View summary text” below to select it manually."); }
  }

  return <section className={styles.workspace} aria-label="Patient story workspace">
    <div className={styles.recordBar}>
      <div className={styles.recordIdentity}><span className={styles.recordIcon}><Icon name="bed" size={22} /></span><div><h2>Simulated {record.label.split(" · ")[0]}</h2><p>{record.age !== null ? `${record.age} years` : "Age unavailable"} · {record.sex === "F" ? "Female" : record.sex === "M" ? "Male" : "Sex unavailable"} · {record.label.split(" · ")[1] ?? "Patient scenario"}</p></div></div>
      <div className={styles.recordActions}><span className={styles.reviewMode}><Icon name="clock" size={14} />Retrospective review</span><button className={styles.secondaryButton} aria-describedby="story-start-help" onClick={() => { setIndex(0); setPlaying(true); setCopyStatus(""); }}><Icon name="replay" size={16} />Replay from start</button></div>
    </div>
    <div className={styles.startGuide} id="story-start-help">
      <Icon name="info" size={18} />
      <p><strong>Start from the beginning or explore this moment.</strong>{" "}<span>Use “Replay from start” to follow the story, or choose a chapter below. Select a reading to inspect its trend.</span></p>
    </div>

    <div className={styles.workspaceGrid}>
      <div className={styles.mainColumn}>
        <section ref={trendRef} tabIndex={-1} className={styles.trend} aria-labelledby="story-trend-heading">
          <div className={styles.sectionHeading}>
            <div><p className={styles.eyebrow}>01 / FOLLOW THE TREND</p><h3 id="story-trend-heading">{focused ? focused.label : "Illustrative risk trend"}</h3></div>
            <div className={styles.currentHour}><span>{playing ? "Playing" : index === lastIndex ? "Complete" : "Paused"}</span><strong>Hour {hour.hour}<small> / {lastHour}</small></strong></div>
          </div>
          <div className={styles.chartMeta}>
            <div className={styles.chartActions}><button className={styles.chartToggle} aria-pressed={focus === "risk"} onClick={() => setFocus("risk")}>Illustrative score</button>{focused && <a className={styles.backToReadings} href="#story-readings-heading">Back to readings <Icon name="arrow" size={14} /></a>}</div>
            {focused ? <span>{focused.unit} · gaps indicate missing readings</span> : <span className={styles.inlineScore} data-level={level}><strong>{display(hour.risk, 2)}</strong> {SCORE_LABELS[level]}</span>}
          </div>
          <div className={styles.chart} role="img" aria-label={`${focused?.label ?? "Illustrative score"} through hour ${hour.hour}. Future readings are hidden. Exact values are listed below.`}>
            <LineChart responsive data={visible} style={{ width: "100%", height: "100%" }} margin={{ top: 16, right: 16, left: -16, bottom: 0 }} accessibilityLayer>
              <CartesianGrid stroke="#e7eeeb" vertical={false} strokeDasharray="3 4" />
              <XAxis dataKey="hour" type="number" domain={[firstHour, Math.max(firstHour + 1, lastHour)]} tickCount={6} tickFormatter={(value) => `h${value}`} axisLine={false} tickLine={false} tick={{ fill: "#61756d", fontSize: 11 }} minTickGap={25} />
              <YAxis domain={focus === "risk" ? [0, 1] : ["auto", "auto"]} width={55} axisLine={false} tickLine={false} tick={{ fill: "#61756d", fontSize: 11 }} tickCount={5} />
              {focus === "risk" && <><ReferenceLine y={0.3} stroke="#c4ab70" strokeDasharray="4 5" /><ReferenceLine y={0.6} stroke="#c7857d" strokeDasharray="4 5" /></>}
              {focused?.reference !== null && focused?.reference !== undefined && <ReferenceLine y={focused.reference} stroke="#849f93" strokeDasharray="4 5" />}
              {hour.hour < lastHour && <ReferenceArea x1={hour.hour} x2={lastHour} fill="#eef2ef" fillOpacity={0.65} />}
              <Tooltip labelFormatter={(value) => `Hour ${value}`} formatter={(value) => [typeof value === "number" ? value.toFixed(focused?.decimals ?? 2) : "No reading", focused?.label ?? "Illustrative score"]} contentStyle={{ border: "1px solid #d9e4dd", borderRadius: 8, fontSize: 12 }} />
              {focus === "risk" && <RiskStroke id={riskStrokeId} />}
              <Line dataKey={focus} type="linear" stroke={focus === "risk" ? `url(#${riskStrokeId})` : "#226f5b"} strokeWidth={2.5} dot={focus === "tempC" ? { r: 3, fill: "#226f5b", strokeWidth: 0 } : visible.length === 1 ? { r: 4, fill: focus === "risk" && level === "red" ? "#b8322a" : "#226f5b" } : false} activeDot={{ r: 5, strokeWidth: 3, stroke: "white", fill: focus === "risk" ? `url(#${riskStrokeId})` : "#226f5b" }} connectNulls={false} isAnimationActive={false} />
              <ReferenceLine x={hour.hour} stroke="#244c3e" strokeDasharray="3 4" />
              {focus === "risk" && hour.risk !== null && <ReferenceDot x={hour.hour} y={hour.risk} r={4} fill={level === "red" ? "#b8322a" : "#226f5b"} stroke="white" strokeWidth={1.5} />}
            </LineChart>
          </div>
          <div className={styles.chartKey}><span><i />{focused ? "Recorded reading" : "Illustrative score (not a percentage)"}</span><span><i className={styles.dashed} />{focused ? "Initial reference" : "Illustrative thresholds: 0.30 / 0.60"}</span><span className={styles.futureKey}>Shaded area: not yet revealed</span></div>
          <div className={styles.transport}>
            <button className={styles.playButton} aria-label={playing ? "Pause replay" : index === lastIndex ? "Restart replay" : "Play replay"} onClick={() => { if (index === lastIndex) setIndex(0); setPlaying(!playing); setCopyStatus(""); }}><span aria-hidden="true">{playing ? "Ⅱ" : "▶"}</span>{playing ? "Pause" : index === lastIndex ? "Restart" : "Play"}</button>
            <div className={styles.scrubber}><label htmlFor="story-hour">Explore the timeline <span>Hour {hour.hour} of {lastHour}</span></label><input id="story-hour" type="range" min={0} max={lastIndex} value={index} onChange={(event) => seek(Number(event.target.value))} aria-valuetext={`Hour ${hour.hour} of ${lastHour}`} /></div>
            <label className={styles.speed}><span className={styles.srOnly}>Replay speed</span><select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option></select></label>
            <div className={styles.hourSteps}>
              <button aria-label="Previous timeline hour" disabled={index === 0} onClick={() => seek(Math.max(0, index - 1))}>−1 hour</button>
              <span role="status">{playing ? "Playing" : index === lastIndex ? "Complete" : "Paused"} · h{hour.hour}</span>
              <button aria-label="Next timeline hour" disabled={index === lastIndex} onClick={() => seek(Math.min(lastIndex, index + 1))}>+1 hour</button>
            </div>
          </div>
          <div className={styles.momentHeading}>SCENARIO CHAPTERS <span>Retrospective shortcuts, not predictions</span></div>
          <div className={styles.moments}>{moments.map((moment) => <button key={moment.number} onClick={() => seek(moment.index)} aria-pressed={index === moment.index}><span>{moment.number}</span><strong>{moment.label}</strong><small>h{record.hours[moment.index].hour}</small></button>)}</div>
        </section>

        <section className={styles.readings} aria-labelledby="story-readings-heading">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>02 / INSPECT THE READINGS</p><h3 id="story-readings-heading" tabIndex={-1}>What changed from the initial reference?</h3></div><span className={styles.freshBadge}>{snapshot.freshCount}/4 at this hour</span></div>
          <div className={styles.columnLabels} aria-hidden="true"><span>VITAL SIGN</span><span>AT HOUR {hour.hour}</span><span>INITIAL → CURRENT</span><span>CHANGE</span><span>LATEST RECORDED</span></div>
          <p className={styles.inspectHint}>Select a reading to inspect its trend. The initial reference is the middle value of available readings in the first 12 hours, not a healthy target. Differences are numeric comparisons, not medical warning thresholds.</p>
          <div className={styles.readingRows}>{snapshot.observations.map((item) => <button key={item.key} className={styles.readingRow} data-missing={item.current === null} aria-pressed={focus === item.key} onClick={() => inspect(item.key)} aria-label={`Inspect ${item.label} trend`} aria-describedby={`story-${record.id}-${item.key}-description story-${record.id}-${item.key}-latest`}>
            <span id={`story-${record.id}-${item.key}-description`} className={styles.srOnly}>{observationDescription(item)}</span>
            <span className={styles.vitalName}><Icon name={ICONS[item.key]} size={19} /><span><strong>{item.label}</strong><small>{item.current !== null ? "Recorded this hour" : item.lastValue !== null ? `Last: ${display(item.lastValue, item.decimals)} ${item.unit} · ${item.ageHours} h ago` : "No readings yet"}</small></span></span>
            <span className={styles.vitalNumber}>{display(item.current, item.decimals)}<small>{item.current === null ? "Not recorded" : item.unit}</small></span>
            <span className={styles.comparison}>{item.reference === null ? <small>Building reference</small> : <><span>{display(item.reference, item.decimals)}</span><Icon name="arrow" size={16} /><strong>{display(item.current, item.decimals)}</strong></>}</span>
            <span className={styles.delta}>{item.delta === null ? "—" : signed(item.delta)}<small>{item.delta === null ? "No comparison" : item.key === "spo2" ? "percentage points" : item.unit}</small></span>
            <span className={styles.latestReading} id={`story-${record.id}-${item.key}-latest`}>
              <span className={styles.latestLabel}>Latest recorded</span>
              <strong>{display(item.lastValue, item.decimals)}{item.lastValue !== null && <small> {item.unit}</small>}</strong>
              <small>{item.lastValue === null || item.ageHours === null ? "No readings yet" : `Hour ${hour.hour - item.ageHours} · ${item.ageHours === 0 ? "This hour" : `${item.ageHours} h earlier`}`}</small>
            </span>
          </button>)}</div>
          <details className={styles.method}><summary>How this reference is calculated <Icon name="chevron" size={14} /></summary><p>The median of non-missing readings from the first 12 hours, using only records revealed so far. Each vital needs at least three measurements. {snapshot.referenceComplete ? "The reference window is complete and stays fixed." : "The reference is still building and may change."} This is an initial reference, not an established healthy baseline. Missing current readings are never filled in.</p></details>
        </section>
      </div>

      <aside className={styles.contextColumn} aria-label="Context for the selected hour">
        <section className={styles.storyCard}>
          <div className={styles.storyTop}><p className={styles.eyebrow}>03 / PUT IT TOGETHER</p><Icon name="table" size={18} /></div>
          <h3>The story at<br />hour {hour.hour}.</h3>
          <p className={styles.storyLead}>{!snapshot.referenceComplete ? "The initial reference is still building." : changed.length ? `${changed.length} current ${changed.length === 1 ? "reading differs" : "readings differ"} from this patient’s initial reference.` : "No changes can be established from the available comparisons."}</p>
          <ul className={styles.findings}>{snapshot.observations.filter((item) => item.current !== null).map((item) => <li key={item.key}><span>{item.label}</span><p>{item.delta !== null ? <><strong>{item.delta === 0 ? "Unchanged" : `${Math.abs(item.delta)} ${item.key === "spo2" ? "percentage points" : item.unit} ${item.delta > 0 ? "above" : "below"}`}</strong> {item.delta === 0 ? "from" : "the"} initial reference.</> : <>Not enough reference readings for a comparison.</>}</p></li>)}</ul>
          {missing.length > 0 && <div className={styles.missingNote}><Icon name="clock" size={17} /><div>
            <strong>{missing.length} {missing.length === 1 ? "reading" : "readings"} not recorded this hour</strong>
            {missing.map((item) => <p key={item.key}><strong>{item.label}</strong><br />{earlierObservationContext(item, hour.hour)?.replace(/(\d+) h /g, "$1\u00a0h ")}</p>)}
          </div></div>}
          <button className={styles.copyButton} onClick={copy}><Icon name="table" size={16} />Copy observation summary<Icon name="arrow" size={16} /></button>
          <p className={styles.copyStatus} role="status">{copyStatus}</p>
          <details className={styles.summaryText}><summary>View summary text</summary><textarea aria-label="Observation summary text" readOnly value={summary} rows={12} /></details>
        </section>
        <section className={styles.scoreCard} data-level={level}>
          <div className={styles.scoreHeading}><span className={styles.scoreDot} /><h3>{SCORE_LABELS[level]}</h3></div>
          <div className={styles.scoreNumber}>{display(hour.risk, 2)}<span>/ 1.00</span></div>
          <p>This number is supplied by the scenario record. It is not a validated prediction or a probability.</p>
          <div className={styles.scoreScale} aria-hidden="true"><span /><span /><span />{hour.risk !== null && <i style={{ left: `${hour.risk * 100}%` }} />}</div>
          <div className={styles.scaleLabels}><span>Low</span><span>Elevated</span><span>High</span></div>
        </section>
      </aside>
    </div>
    <div className={styles.bottomNote}><span><Icon name="check" size={15} />All panels follow the same selected hour.</span><Link href="/research">Explore the separate research model <Icon name="arrow" size={15} /></Link><Link href="/replay/classic">Open detailed comparison <Icon name="arrow" size={15} /></Link></div>
  </section>;
}
