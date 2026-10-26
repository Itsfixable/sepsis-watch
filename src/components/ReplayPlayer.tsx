"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { Icon } from "@/components/Icon";
import { ReplayInsights } from "@/components/ReplayInsights";
import { hourTicks, RiskChart, type ChartMarker } from "@/components/RiskChart";
import { StatusLight } from "@/components/StatusLight";
import { VitalTiles, type TileValue } from "@/components/VitalTiles";
import { firstRedHour, replaySummary } from "@/lib/replaySummary";
import type { ReplayRecord, VitalKey } from "@/lib/types";
import { lastKnown, VITALS } from "@/lib/vitals";
import { firstNews2AlertHour, news2Comparison, news2Series } from "@/lib/news2";
import { RISK_THRESHOLDS, riskLevel } from "@/lib/thresholds";

const SPEEDS = [1, 2, 4] as const;
type Speed = (typeof SPEEDS)[number];

export function ReplayPlayer({ replays }: { replays: ReplayRecord[] }) {
  const [selectedId, setSelectedId] = useState(() => replays.find((record) => record.id === "patient-a")?.id ?? replays[0]?.id);
  const replay = replays.find((r) => r.id === selectedId) ?? replays[0];
  if (!replay) return <div className="empty-chart-content"><Icon name="replay" size={28} /><h2>No patient replays available</h2><p>Patient records will appear here when they have been added to this workspace.</p></div>;
  return (
    <div className="replay-workspace">
      <fieldset className="patient-picker">
        <legend className="sr-only">Choose a patient</legend>
        {replays.map((r, i) => (
          <label key={r.id} className="patient-option">
            <input className="sr-only" type="radio" name="patient" value={r.id} checked={r.id === replay.id} onChange={() => setSelectedId(r.id)} />
            <span className="patient-monogram" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
            <span className="patient-option-details"><span className="patient-option-name">{r.label}</span><span className="patient-option-meta">{[r.age !== null ? `${r.age} years` : null, r.sex === "F" ? "Female" : r.sex === "M" ? "Male" : null, `${r.hours.length}h record`].filter(Boolean).join(" · ")}</span></span>
            <span className="source-badge">{r.source === "physionet2019" ? "PhysioNet 2019" : "Simulated data"}</span>
          </label>
        ))}
      </fieldset>
      <Player key={replay.id} replay={replay} />
    </div>
  );
}

function Player({ replay }: { replay: ReplayRecord }) {
  const illustrative = replay.source === "synthetic";
  const hours = replay.hours;
  const lastIndex = hours.length - 1;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      const next = Math.min(index + 1, lastIndex);
      setIndex(next);
      if (next === lastIndex) setPlaying(false);
    }, 1000 / speed);
    return () => clearTimeout(timer);
  }, [playing, index, speed, lastIndex]);

  const current = hours[index];
  const atEnd = index === lastIndex;
  const redHour = firstRedHour(hours);
  const onset = replay.sepsisOnsetHour;
  const onsetLabel = replay.source === "synthetic" ? "Simulated onset" : "Recorded onset";
  const elevatedIndex = hours.findIndex((h) => h.risk !== null && h.risk >= RISK_THRESHOLDS.yellow);
  const redIndex = hours.findIndex((h) => h.risk !== null && h.risk >= RISK_THRESHOLDS.red);
  const onsetIndex = onset === null ? -1 : hours.findIndex((h) => h.hour >= onset);
  const news2Scores = news2Series(hours);
  const news2Hour = firstNews2AlertHour(hours);
  function jumpTo(nextIndex: number) {
    setPlaying(false);
    setIndex(nextIndex);
  }
  function togglePlay() {
    if (playing) return setPlaying(false);
    if (atEnd) setIndex(0);
    setPlaying(true);
  }

  const markers: ChartMarker[] = [];
  if (redHour !== null && current.hour >= redHour) markers.push({ x: redHour, label: `High score · h${redHour}`, tone: "critical" });
  if (news2Hour !== null && current.hour >= news2Hour) markers.push({ x: news2Hour, label: `Partial NEWS2 · h${news2Hour}`, tone: "warning" });
  if (onset !== null && current.hour >= onset) markers.push({ x: onset, label: `${onsetLabel} · h${onset}`, tone: "neutral" });

  const tiles = Object.fromEntries(VITALS.map(({ key }) => {
    const found = lastKnown(hours, key, index);
    const age = found ? current.hour - hours[found.index].hour : 0;
    const tile: TileValue = { value: found?.value ?? null, note: found && age > 0 ? `from ${age} h ago` : undefined };
    return [key, tile];
  })) as Record<VitalKey, TileValue>;

  const firstHour = hours[0].hour;
  const finalHour = hours[lastIndex].hour;
  const shown = hours.slice(0, index + 1);
  const summary = replaySummary(replay);
  const progress = lastIndex === 0 ? 100 : (index / lastIndex) * 100;
  const playLabel = playing ? "Pause replay" : atEnd ? "Replay again" : index === 0 ? "Start replay" : "Continue replay";

  return (
    <>
      <div className="replay-description"><span>About this record</span><p>{replay.description}</p></div>
      <div className="replay-context"><Icon name="info" size={16} /><p>{replay.source === "synthetic" ? "These are invented patient scenarios and illustrative risk scores. Replay demonstrates the interface, not predictive accuracy." : "This replay uses a de-identified hospital record with supplied model scores. One patient's timeline is not a measure of overall model performance."}</p></div>
      <div className="playback-panel">
        <p className="playback-selected">{replay.label}<span>{replay.source === "synthetic" ? "Simulated data" : "Hospital record"}</span></p>
        <button type="button" onClick={togglePlay} className="play-button">
          {playing ? <PauseIcon /> : atEnd ? <Icon name="replay" size={17} /> : <PlayIcon />}{playLabel}
        </button>
        <p className="playback-hour" aria-live="off"><strong>Hour {current.hour}</strong> of {finalHour}</p>
        <div className="playback-timeline">
          <label><span className="sr-only">Hour of the stay</span><input type="range" className="scrubber" min={0} max={lastIndex} step={1} value={index} onChange={(e) => { setPlaying(false); setIndex(Number(e.target.value)); }} aria-valuetext={`Hour ${current.hour} of ${finalHour}`} style={{ "--progress": `${progress}%` } as React.CSSProperties} /></label>
          <div className="playback-endpoints"><span>Admission · h{firstHour}</span><span>h{finalHour}</span></div>
        </div>
        <span className="playback-speed-label">Speed</span>
        <fieldset className="segmented-control"><legend className="sr-only">Playback speed</legend>{SPEEDS.map((s) => <label key={s}><input className="sr-only" type="radio" name="speed" checked={speed === s} onChange={() => setSpeed(s)} />{s}×</label>)}</fieldset>
      </div>
      <div className="replay-moments" role="group" aria-label="Jump to a key moment">
        <span>Jump to</span>
        <button type="button" className="button" onClick={() => jumpTo(0)}>Start</button>
        {elevatedIndex >= 0 && <button type="button" className="button" onClick={() => jumpTo(elevatedIndex)}>First elevated score<span>h{hours[elevatedIndex].hour}</span></button>}
        {redIndex >= 0 && <button type="button" className="button" onClick={() => jumpTo(redIndex)}>First high score<span>h{hours[redIndex].hour}</span></button>}
        {onsetIndex >= 0 && <button type="button" className="button" onClick={() => jumpTo(onsetIndex)}>{onsetLabel}<span>h{hours[onsetIndex].hour}</span></button>}
        <button type="button" className="button" onClick={() => jumpTo(lastIndex)}>View result<Icon name="arrow" size={13} /></button>
      </div>

      {atEnd && <div role="status" className="replay-result" data-outcome={summary.outcome}><Icon name="info" size={19} /><div><h2>{summary.text}</h2><p className="replay-compare">{news2Comparison(redHour, news2Hour)}</p><p>{replay.source === "synthetic" ? "Simulated scenario. These values illustrate the dashboard and do not validate clinical performance." : "Replayed from a de-identified PhysioNet 2019 record with supplied model scores."}</p></div></div>}

      <VitalTiles values={tiles} history={shown} sourceLabel={replay.source === "synthetic" ? "Simulated observation" : "Hospital record"} />
      <div className="monitor-grid">
        <section aria-labelledby="replay-trend-title" className="trend-panel">
          <div className="panel-heading"><div><h2 id="replay-trend-title">{illustrative ? "Illustrative score over time" : "Risk over time"}</h2><p className="panel-subtitle">{replay.label} · Hour {firstHour} to {finalHour}</p></div><span className="replay-heading-tag"><Icon name="replay" size={12} />{illustrative ? "Scenario replay" : "Historical replay"}</span></div>
          <div className="chart-legend"><span /><span>{illustrative ? "Illustrative score" : "Risk score"}</span><span className="chart-legend-note">{illustrative ? "Simulated scenario" : "PhysioNet 2019 record"}</span></div>
          <RiskChart points={shown.map((h) => ({ x: h.hour, risk: h.risk }))} xDomain={firstHour === finalHour ? [firstHour, finalHour + 1] : [firstHour, finalHour]} xTicks={hourTicks(firstHour, finalHour)} formatTick={(x) => `h${x}`} formatX={(x) => `Hour ${x}`} markers={markers} showEndDot illustrative={illustrative} ariaLabel={`${illustrative ? "Illustrative score" : "Risk score"} for ${replay.label} up to hour ${current.hour}. ${atEnd ? summary.text : ""}`} />
          <div className="chart-footer"><Legend markers={markers} onsetLabel={onsetLabel} /><span>{shown.length} of {hours.length} readings</span></div>
        </section>
        <StatusLight risk={current.risk} caption={`Hour ${current.hour}`} noScoreMessage="No risk score was recorded for this hour." illustrative={illustrative} />
      </div>
      <ReplayInsights hours={hours} index={index} level={riskLevel(current.risk)} news2={news2Scores[index]} />
      <DataTable caption={`Hourly data for ${replay.label} up to hour ${current.hour}`} rows={shown.map((h) => ({ ...h, key: String(h.hour), time: `Hour ${h.hour}` }))} illustrative={illustrative} timeLabel={illustrative ? "Simulated hour" : "Hour"} />
    </>
  );
}

function Legend({ markers, onsetLabel }: { markers: ChartMarker[]; onsetLabel: string }) {
  if (!markers.length) return <span><Icon name="clock" size={12} />1× plays one hour per second</span>;
  return <ul className="replay-legend">{markers.map((m) => <li key={m.tone}>{m.tone === "critical" ? <span aria-hidden="true" className="h-3 w-0.5 bg-critical" /> : m.tone === "warning" ? <span aria-hidden="true" className="h-3 w-0 border-l-2 border-dashed border-warning" /> : <span aria-hidden="true" className="h-3 w-0 border-l-2 border-dotted border-ink" />}{m.tone === "critical" ? "High-score threshold reached" : m.tone === "warning" ? "Four-vital NEWS2 (partial score) threshold" : onsetLabel}</li>)}</ul>;
}

function PlayIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>;
}
function PauseIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>;
}
