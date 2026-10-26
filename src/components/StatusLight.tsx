import { LEVEL_TEXT, RISK_THRESHOLDS, riskLevel } from "@/lib/thresholds";
import { formatRisk } from "@/lib/vitals";
import { Icon } from "./Icon";

type Props = { risk: number | null; caption?: string; noScoreMessage?: string; illustrative?: boolean };

export function StatusLight({ risk, caption, noScoreMessage, illustrative = false }: Props) {
  const level = riskLevel(risk);
  const text = LEVEL_TEXT[level];
  return (
    <section aria-label={illustrative ? "Illustrative score status" : "Sepsis early-warning status"} className="risk-panel" data-level={level}>
      <div className="panel-heading"><h2>{illustrative ? "Illustrative score" : "Early warning"}</h2><Icon name="activity" size={19} /></div>
      <div className="risk-reading" aria-live={illustrative ? "off" : "polite"} aria-atomic="true">
        <span className="risk-badge"><Icon name={level === "green" ? "check" : level === "none" ? "clock" : "alert"} size={14} />{level === "none" ? illustrative ? "No score" : "Awaiting data" : `${text.title} ${illustrative ? "score" : "risk"}`}</span>
        <p className="risk-number">{formatRisk(risk)}<span>/ 1.00</span></p>
        <p className="risk-caption">{illustrative ? "Illustrative score" : "Sepsis risk score"}{caption ? ` · ${caption}` : ""}</p>
      </div>
      <div className="risk-scale" aria-hidden="true">
        <div className="risk-scale-track" style={{ gridTemplateColumns: `${RISK_THRESHOLDS.yellow}fr ${RISK_THRESHOLDS.red - RISK_THRESHOLDS.yellow}fr ${1 - RISK_THRESHOLDS.red}fr` }}>
          <span /><span /><span />
          {risk !== null && <i style={{ left: `${Math.max(0, Math.min(1, risk)) * 100}%` }} />}
        </div>
        <div className="risk-scale-labels"><span>0.00</span><span>1.00</span></div>
      </div>
      <p className="risk-message">{illustrative ? level === "none" ? "No illustrative score recorded this hour." : "Supplied by the simulated record, not a validated prediction or a probability." : level === "none" && noScoreMessage ? noScoreMessage : text.message}</p>
      {illustrative && <p className="risk-caption">Illustrative thresholds</p>}
      <dl className="threshold-list">
        <div><dt><span className="status-dot dot-good" />Low</dt><dd>&lt; {RISK_THRESHOLDS.yellow.toFixed(2)}</dd></div>
        <div><dt><span className="status-dot dot-warning" />Elevated</dt><dd>{RISK_THRESHOLDS.yellow.toFixed(2)}–&lt;{RISK_THRESHOLDS.red.toFixed(2)}</dd></div>
        <div><dt><span className="status-dot dot-critical" />High</dt><dd>≥ {RISK_THRESHOLDS.red.toFixed(2)}</dd></div>
      </dl>
      <p className="risk-footnote"><Icon name="info" size={13} />{illustrative ? "Research prototype · not a diagnosis" : "Early warning, not a diagnosis"}</p>
    </section>
  );
}
