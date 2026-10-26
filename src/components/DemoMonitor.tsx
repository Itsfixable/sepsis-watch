"use client";

import Link from "next/link";
import { useEffect, useReducer, useState } from "react";
import { DataTable } from "./DataTable";
import { Icon } from "./Icon";
import { hourTicks, RiskChart } from "./RiskChart";
import { StatusLight } from "./StatusLight";
import { VitalTiles } from "./VitalTiles";
import { DEMO_INTERVAL_MS, demoRecords, demoSessionReducer, demoSnapshot, initialDemoSession } from "@/lib/demoMonitor";
import type { ReplayRecord } from "@/lib/types";
import styles from "./DemoMonitor.module.css";

export function DemoMonitor({ records }: { records: ReplayRecord[] }) {
  const scenarios = demoRecords(records);
  const [selected, setSelected] = useState(() => scenarios.find((r) => r.id === "patient-a")?.id ?? scenarios[0]?.id ?? "");
  const record = scenarios.find((r) => r.id === selected) ?? scenarios[0];

  return (
    <div className={`page-shell ${styles.root}`}>
      <div className="breadcrumb"><span>Workspace</span><Icon name="chevron" size={11} /><span>Monitor</span></div>
      <div className="page-heading">
        <div><h1>Monitor</h1><p className="page-description">Watch observations arrive. See the picture change.</p></div>
        {record && <label className={styles.picker}>Patient
          <select value={record.id} onChange={(event) => setSelected(event.target.value)}>
            {scenarios.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </label>}
      </div>
      {record ? <DemoSession key={record.id} record={record} /> : (
        <section className={styles.empty}><h2>No patient scenarios available</h2><p>No patient scenarios are available to stream.</p><Link href="/replay" className="text-link">Explore timelines<Icon name="arrow" size={14} /></Link></section>
      )}
    </div>
  );
}

function DemoSession({ record }: { record: ReplayRecord }) {
  const total = record.hours.length;
  const [session, dispatch] = useReducer(demoSessionReducer, total, initialDemoSession);
  const { rows, current, tiles } = demoSnapshot(record.hours, session.count);
  const complete = session.count >= total;
  const finalHour = record.hours.at(-1)!.hour;
  const currentHour = current?.hour ?? 0;
  const firstHour = rows[0]?.hour ?? 0;
  const resetHour = record.hours[Math.min(24, total) - 1].hour;
  const domain: [number, number] = firstHour === currentHour ? [firstHour, firstHour + 1] : [firstHour, currentHour];

  useEffect(() => {
    if (!session.playing) return;
    const timer = window.setInterval(() => dispatch({ type: "tick", length: total }), DEMO_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [session.playing, total]);

  return (
    <>
      <div className={styles.controls}>
        <div className={styles.streamState}>
          <p role="status"><span className={`status-dot ${session.playing ? "dot-good" : ""}`} />{complete ? "Playback complete" : session.playing ? "Playback running" : "Playback paused"}</p>
          <span id="demo-pace">One simulated hour every 3 seconds · first {Math.min(24, total)} observations preloaded</span>
          <span id="demo-reset-help">Reset to hour {resetHour} restores the first {Math.min(24, total)} observations and pauses. Press Resume to continue.</span>
          <span>Hour 0 is the first observation. Hour {currentHour} is observation {rows.length} of {total}.</span>
        </div>
        <div className={styles.buttons}>
          <button type="button" className="button button-primary" onClick={() => dispatch({ type: "toggle", length: total })} disabled={complete} aria-describedby="demo-pace">
            {complete ? "Completed" : session.playing ? "Pause" : "Resume"}
          </button>
          <button type="button" className="button" aria-describedby="demo-reset-help" onClick={() => dispatch({ type: "restart", length: total })}><Icon name="refresh" size={15} />Reset to hour {resetHour}</button>
        </div>
      </div>

      <div className="patient-strip">
        <span className="bed-icon"><Icon name="monitor" size={20} /></span>
        <div className="patient-title"><strong>Simulated {record.label}</strong><span>{record.age !== null ? `${record.age} years · ` : ""}Simulated scenario</span></div>
        <span className="patient-strip-meta"><Icon name="clock" size={13} />Hour {currentHour} of {finalHour}</span>
      </div>
      <VitalTiles values={tiles} history={rows} sourceLabel="Simulated observation" />

      <div className="monitor-grid">
        <section aria-labelledby="demo-trend-title" className="trend-panel">
          <div className="panel-heading"><div><h2 id="demo-trend-title">Illustrative score over time</h2><p className="panel-subtitle">Only observations revealed so far · gaps mean no score</p></div></div>
          <div className="chart-legend"><span /><span>Illustrative score</span><span className="chart-legend-note">Not a probability</span></div>
          <RiskChart
            points={rows.map((r) => ({ x: r.hour, risk: r.risk }))}
            xDomain={domain}
            xTicks={hourTicks(domain[0], domain[1])}
            formatTick={(hour) => `h${hour}`}
            formatX={(hour) => `Simulated hour ${hour}`}
            showEndDot
            illustrative
            ariaLabel={`Illustrative score through simulated hour ${currentHour}. ${rows.length} observations revealed. Current score ${current?.risk === null ? "not recorded" : current?.risk.toFixed(2)}. Exact values are in the observations table.`}
          />
          <div className="chart-footer"><span>{rows.length} of {total} observations revealed</span><span>Simulated time</span></div>
        </section>
        <StatusLight risk={current?.risk ?? null} caption={`Hour ${currentHour}`} illustrative />
      </div>

      <DataTable rows={rows.map((r) => ({ ...r, key: String(r.hour), time: `Hour ${r.hour}` }))} caption="Revealed simulated observations; dashes indicate missing measurements" illustrative timeLabel="Simulated hour" />
      <p className={styles.safety}>A research prototype, not a medical device. A low illustrative score does not mean someone is well. If someone seems seriously unwell, seek medical help regardless of this display.</p>
      <section className="replay-promo" aria-label="Explore timelines">
        <div className="promo-icon"><Icon name="replay" size={20} /></div>
        <div><h2>Explore the full patient story</h2><p>Inspect individual readings and compare them with the patient&apos;s initial reference.</p></div>
        <Link href="/replay" className="text-link">Explore timelines<Icon name="arrow" size={16} /></Link>
      </section>
    </>
  );
}
