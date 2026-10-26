"use client";

import { useState } from "react";
import Link from "next/link";
import { RiskChart, hourTicks, type ChartMarker } from "./RiskChart";
import { Icon } from "./Icon";
import { firstRedHour, replaySummary } from "@/lib/replaySummary";
import type { ReplayRecord } from "@/lib/types";

export function ProjectPreview({ replays }: { replays: ReplayRecord[] }) {
  const [selectedId, setSelectedId] = useState(replays[0]?.id);
  const replay = replays.find((record) => record.id === selectedId) ?? replays[0];
  if (!replay) return <div className="project-preview"><h2>Patient timelines</h2><p>No replay records are available yet.</p></div>;
  const start = replay.hours[0].hour;
  const end = replay.hours.at(-1)!.hour;
  const red = firstRedHour(replay.hours);
  const markers: ChartMarker[] = [];
  if (red !== null) markers.push({ x: red, label: `First high score · h${red}`, tone: "critical" });
  if (replay.sepsisOnsetHour !== null) markers.push({ x: replay.sepsisOnsetHour, label: `${replay.source === "synthetic" ? "Simulated" : "Recorded"} onset · h${replay.sepsisOnsetHour}`, tone: "neutral" });
  return (
    <section className="project-preview" aria-labelledby="preview-title">
      <div className="preview-heading"><h2 id="preview-title">A score in context</h2><span className="evidence-tag">{replay.source === "synthetic" ? "Synthetic data" : "Hospital record"}</span></div>
      <label className="preview-select">Explore a patient timeline
        <select value={replay.id} onChange={(event) => setSelectedId(event.target.value)}>{replays.map((record) => <option key={record.id} value={record.id}>{record.label}</option>)}</select>
      </label>
      <RiskChart points={replay.hours.map((hour) => ({ x: hour.hour, risk: hour.risk }))} xDomain={[start, end === start ? end + 1 : end]} xTicks={hourTicks(start, end)} formatTick={(hour) => `h${hour}`} formatX={(hour) => `Hour ${hour}`} markers={markers} illustrative={replay.source === "synthetic"} ariaLabel={`${replay.label}. ${replaySummary(replay).text}`} />
      <p className="preview-result" aria-live="polite">{replaySummary(replay).text}</p>
      <div className="preview-footer"><Link href="/replay" className="text-link">Explore timelines<Icon name="arrow" size={14} /></Link></div>
    </section>
  );
}
