// Two panels under the replay chart: what moved away from this patient's
// normal, and the warning signs a person can check for themselves.

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
  const warning = level === "yellow" || level === "red";

  return (
    <div className="insight-grid">
      <section className="insight-panel" aria-labelledby="changes-title">
        <h2 id="changes-title">What changed from normal</h2>
        {!baselineReady(index) ? (
          <p className="insight-note">Learning this patient&apos;s normal from their first 12 hours.</p>
        ) : changes.length === 0 ? (
          <p className="insight-note">
            {warning
              ? "No single vital has moved far yet, so the warning comes from small changes in several at once."
              : "All four vitals are close to this patient's own normal."}
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
        <p className="insight-footer">
          Standard nurse checklist (NEWS2, four vitals): <strong>{news2 ?? "--"}</strong>
          {news2 !== null && news2 >= NEWS2_ALERT_AT ? " · at its alert level" : ` · alerts at ${NEWS2_ALERT_AT}`}
        </p>
      </section>
      <section className="insight-panel" data-urgent={level === "red" || undefined} aria-labelledby="signs-title">
        <h2 id="signs-title">{level === "red" ? "Check for these signs now" : "Sepsis warning signs to check"}</h2>
        <p className="insight-note">
          {level === "red"
            ? "If the patient has any of these, get medical help right away and ask: \"Could this be sepsis?\""
            : "The score is one input. Look at the patient too: these signs matter even when the light is green."}
        </p>
        <ul className="sign-list">{SIGNS.map((s) => <li key={s}>{s}</li>)}</ul>
        <p className="insight-footer">Signs from the CDC. SepsisWatch is an early warning, not a diagnosis.</p>
      </section>
    </div>
  );
}
