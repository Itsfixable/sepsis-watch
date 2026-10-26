// Historical reference comparisons and general sepsis awareness information.

import { baselineReady, changesFromBaseline } from "@/lib/baseline";
import { NEWS2_ALERT_AT } from "@/lib/news2";
import type { ReplayHour, RiskLevel } from "@/lib/types";

// Warning signs from the CDC's sepsis materials (cdc.gov/sepsis).
const SIGNS = [
  "New or worse confusion",
  "Shortness of breath",
  "Fever, shivering, or feeling very cold",
  "Clammy or sweaty skin",
  "Extreme pain or discomfort",
  "High heart rate",
];

type Props = {
  hours: ReplayHour[];
  index: number;
  level: RiskLevel;
  news2: number | null;
};

export function ReplayInsights({ hours, index, level, news2 }: Props) {
  const changes = changesFromBaseline(hours, index);

  return (
    <div className="insight-grid">
      <section className="insight-panel" aria-labelledby="changes-title">
        <h2 id="changes-title">Changes from the initial reference</h2>
        {!baselineReady(index) ? (
          <p className="insight-note">Building a reference from the first 12 hourly records. This is not an established healthy baseline.</p>
        ) : changes.length === 0 ? (
          <p className="insight-note">
            No changes meet this panel&apos;s comparison criteria, or there are too few readings. This does not establish that the patient is well.
          </p>
        ) : (
          <ul className="change-list">
            {changes.map((c) => (
              <li key={c.key}>
                <span><span aria-hidden="true" className={`status-dot ${c.concerning ? "dot-warning" : ""}`} />{c.label} {c.current > c.baseline ? "up" : "down"}</span>
                <span className="change-values">{c.baseline.toFixed(c.decimals)} → <strong>{c.current.toFixed(c.decimals)}</strong> {c.unit}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="insight-footer">These comparisons use the latest available reading for each vital, which may be older than the selected hour. They do not explain how the supplied score was generated.</p>
        <p className="insight-footer">
          Four-vital NEWS2 comparison (partial score): <strong>{news2 ?? "--"}</strong>
          {news2 !== null && news2 >= NEWS2_ALERT_AT ? " · at the demo threshold" : ` · demo threshold ${NEWS2_ALERT_AT}`}
        </p>
        <p className="insight-footer">This comparison uses oxygen saturation scale 1 and carries earlier measurements forward. It omits blood pressure, consciousness or new confusion, and supplemental oxygen use. It is not a full clinical NEWS2 assessment.</p>
      </section>
      <section className="insight-panel" data-urgent={level === "red" || undefined} aria-labelledby="signs-title">
        <h2 id="signs-title">{level === "red" ? "Check for these signs now" : "Sepsis warning signs to check"}</h2>
        <p className="insight-note">
          {level === "red"
            ? "If the patient has any of these, get medical help right away and ask: \"Could this be sepsis?\""
            : "Seek medical help if someone seems seriously unwell, regardless of the score or light shown here."}
        </p>
        <ul className="sign-list">{SIGNS.map((s) => <li key={s}>{s}</li>)}</ul>
        <p className="insight-footer">Signs from the <a href="https://www.cdc.gov/sepsis/about/index.html" target="_blank" rel="noreferrer" className="underline underline-offset-2">CDC</a>. SepsisWatch is a research prototype, not a validated medical tool.</p>
      </section>
    </div>
  );
}
