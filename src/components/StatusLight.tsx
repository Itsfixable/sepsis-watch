import { LEVEL_TEXT, RISK_THRESHOLDS, riskLevel } from "@/lib/thresholds";
import { formatRisk } from "@/lib/vitals";
import { Icon } from "./Icon";

type Props = { risk: number | null; caption?: string; noScoreMessage?: string };

export function StatusLight({ risk, caption, noScoreMessage }: Props) {
  const level = riskLevel(risk);
  const text = LEVEL_TEXT[level];
  return (
    <section aria-label="Sepsis early-warning status" className="risk-panel" data-level={level}>
      <div className="panel-heading"><h2>Early warning</h2><Icon name="activity" size={19} /></div>
      <div className="risk-reading" aria-live="polite" aria-atomic="true">
        <span className="risk-badge"><Icon name={level === "green" ? "check" : level === "none" ? "clock" : "alert"} size={14} />{level === "none" ? "Awaiting data" : `${text.title} risk`}</span>
        <p className="risk-number">{formatRisk(risk)}<span>/ 1.00</span></p>
        <p className="risk-caption">Sepsis risk score{caption ? ` · ${caption}` : ""}</p>
      </div>
      <div className="risk-scale" aria-hidden="true">
        <div className="risk-scale-track" style={{ gridTemplateColumns: `${RISK_THRESHOLDS.yellow}fr ${RISK_THRESHOLDS.red - RISK_THRESHOLDS.yellow}fr ${1 - RISK_THRESHOLDS.red}fr` }}>
          <span /><span /><span />
          {risk !== null && <i style={{ left: `${Math.max(0, Math.min(1, risk)) * 100}%` }} />}
        </div>
        <div className="risk-scale-labels"><span>0.00</span><span>1.00</span></div>
      </div>
      <p className="risk-message">{level === "none" && noScoreMessage ? noScoreMessage : text.message}</p>
      <dl className="threshold-list">
        <div><dt><span className="status-dot dot-good" />Low</dt><dd>&lt; {RISK_THRESHOLDS.yellow.toFixed(2)}</dd></div>
        <div><dt><span className="status-dot dot-warning" />Elevated</dt><dd>{RISK_THRESHOLDS.yellow.toFixed(2)}–&lt;{RISK_THRESHOLDS.red.toFixed(2)}</dd></div>
        <div><dt><span className="status-dot dot-critical" />High</dt><dd>≥ {RISK_THRESHOLDS.red.toFixed(2)}</dd></div>
      </dl>
      <p className="risk-footnote"><Icon name="info" size={13} />Early warning, not a diagnosis</p>
    </section>
  );
}
