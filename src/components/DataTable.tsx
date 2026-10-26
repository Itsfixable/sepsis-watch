import { riskLevel, LEVEL_TEXT } from "@/lib/thresholds";
import type { Vitals } from "@/lib/types";
import { formatRisk } from "@/lib/vitals";
import { Icon } from "./Icon";

export type TableRow = Vitals & { key: string; time: string; risk: number | null };
const fmt = (v: number | null, decimals = 0) => (v === null ? "—" : v.toFixed(decimals));

export function DataTable({ rows, caption, illustrative = false, timeLabel = "Time" }: { rows: TableRow[]; caption: string; illustrative?: boolean; timeLabel?: string }) {
  return (
    <details className="observations">
      <summary><Icon name="table" size={16} /><span>Recorded observations</span><span className="table-count">{rows.length} {rows.length === 1 ? "reading" : "readings"}</span><Icon name="chevron" size={14} /></summary>
      <div className="table-scroll" role="region" aria-label={caption} tabIndex={0}>
        <table>
          <caption className="sr-only">{caption}</caption>
          <thead><tr><th scope="col" className="text-left">{timeLabel}</th><th scope="col">{illustrative ? "Demo score" : "Risk score"}</th><th scope="col" className="text-left">{illustrative ? "Score level" : "Risk level"}</th><th scope="col">HR · bpm</th><th scope="col">RR · breaths/min</th><th scope="col">Temp · °C</th><th scope="col">SpO₂ · %</th></tr></thead>
          <tbody>{[...rows].reverse().map((r) => <tr key={r.key}><th scope="row" className="text-left">{r.time}</th><td>{formatRisk(r.risk)}</td><td className="text-left"><span className="table-level" data-level={riskLevel(r.risk)}><span className="status-dot" />{LEVEL_TEXT[riskLevel(r.risk)].title}</span></td><td>{fmt(r.heartRate)}</td><td>{fmt(r.respRate)}</td><td>{fmt(r.tempC, 1)}</td><td>{fmt(r.spo2)}</td></tr>)}</tbody>
        </table>
      </div>
    </details>
  );
}
