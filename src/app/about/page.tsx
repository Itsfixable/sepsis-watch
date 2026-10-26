import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ProjectPreview } from "@/components/ProjectPreview";
import { loadReplays } from "@/lib/replays";
import { RISK_THRESHOLDS } from "@/lib/thresholds";

export const metadata: Metadata = {
  title: "Overview",
  description: "Vital signs, risk trends, and patient timelines in one SepsisWatch workspace.",
};

type Tool = { name: string; who: string; where: string; needs: string; evidence: string; source: { label: string; href: string }; ours?: boolean };

// Facts checked on 2026-10-24. Keep the wording close to the sources.
const TOOLS: Tool[] = [
  {
    name: "TREWS",
    who: "Johns Hopkins",
    where: "Inside the hospital",
    needs: "The patient's electronic chart, including lab results",
    evidence: "Studied on 590,736 patients at 5 hospitals. When a doctor confirmed the alert within 3 hours, deaths fell by 18.7% (relative).",
    source: { label: "Nature Medicine, 2022", href: "https://www.healthday.com/healthpro-news/infectious-disease/early-warning-system-can-identify-sepsis-patients-2657700753.html" },
  },
  {
    name: "Sepsis ImmunoScore",
    who: "Prenosis",
    where: "Inside the hospital",
    needs: "22 inputs, including blood test biomarkers",
    evidence: "The first AI sepsis tool authorized by the FDA (De Novo, April 2024).",
    source: { label: "FDA authorization news, 2024", href: "https://www.techtarget.com/pharmalifesciences/news/366607927/FDA-Authorizes-AI-Sepsis-Prediction-Detection-Tool" },
  },
  {
    name: "Epic Sepsis Model",
    who: "Epic Systems",
    where: "Inside the hospital records system",
    needs: "The patient's electronic chart",
    evidence: "Widely used. An independent study at Michigan Medicine found it missed 67% of sepsis cases and alerted on 18% of all patients.",
    source: { label: "JAMA Internal Medicine, 2021", href: "https://www.fiercehealthcare.com/tech/epic-s-widely-used-sepsis-prediction-model-falls-short-among-michigan-medicine-patients" },
  },
  {
    name: "SepsisWatch",
    who: "Student prototype (this project)",
    where: "At the bedside or at home, with no hospital chart",
    needs: "Four vital signs: heart rate, breathing, temperature, oxygen. No blood draw.",
    evidence: "Not tested on real patients yet. The timelines use synthetic data. Next step: testing on real ICU records from PhysioNet 2019.",
    source: { label: "Explore the timelines", href: "/replay" },
    ours: true,
  },
];

export default function AboutPage() {
  const replays = loadReplays();

  return (
    <div className="page-shell project-page">
      <section className="project-hero" aria-labelledby="project-title">
        <div className="project-intro">
          <p className="project-eyebrow">SepsisWatch</p>
          <h1 id="project-title">Make changing risk<br />easier to see.</h1>
          <p className="project-lead">SepsisWatch brings vital signs, risk trends, and early warnings into one clear bedside view.</p>
          <div className="project-actions"><Link className="button button-primary" href="/monitor">Open monitor<Icon name="arrow" size={16} /></Link><Link className="button" href="/replay">Explore timelines</Link></div>
        </div>
        <ProjectPreview replays={replays} />
      </section>

      <section className="project-purpose" aria-labelledby="purpose-title">
        <h2 id="purpose-title">Every reading has a history.</h2>
        <p>A single number tells you what was measured. A timeline shows how it changed. SepsisWatch keeps vital signs, risk scores, and earlier observations together so you can move from the latest reading to the full picture.</p>
      </section>

      <section className="project-section" aria-labelledby="system-title">
        <div className="project-section-heading"><h2 id="system-title">One workspace. The whole timeline.</h2><p>Follow incoming observations, see changes in risk, and revisit the moments that matter.</p></div>
        <ol className="system-flow">
          <li><Icon name="activity" size={25} /><h3>See the latest vitals</h3><p>Heart rate, breathing rate, temperature, and oxygen saturation, together with the time each was measured.</p></li>
          <li><Icon name="signal" size={25} /><h3>Track incoming data</h3><p>The monitor checks for new readings automatically and shows when the connection is lost or readings are delayed.</p></li>
          <li><Icon name="monitor" size={25} /><h3>Follow changing risk</h3><p>View supplied risk scores alongside elevated and high thresholds, with a clear status and trend chart.</p></li>
          <li><Icon name="replay" size={25} /><h3>Revisit key moments</h3><p>Move through a patient timeline, jump to the first warning, and inspect the observations behind each point.</p></li>
        </ol>
      </section>

      <section className="project-section" aria-labelledby="compare-title">
        <div className="project-section-heading"><h2 id="compare-title">How SepsisWatch compares</h2><p>Hospitals already have sepsis warning tools, and some have strong evidence behind them. SepsisWatch is not better than them. It is different: they work once a patient is in the hospital with a full chart, and SepsisWatch needs only four vital signs that can be measured without a blood draw.</p></div>
        <div className="compare-grid">
          {TOOLS.map((t) => (
            <article key={t.name} className="compare-card" data-ours={t.ours || undefined}>
              <div><h3>{t.name}</h3><p className="compare-who">{t.who}</p></div>
              <dl>
                <dt>Where it works</dt><dd>{t.where}</dd>
                <dt className="mt-3">What it needs</dt><dd>{t.needs}</dd>
                <dt className="mt-3">Evidence</dt><dd>{t.evidence}</dd>
              </dl>
              {t.ours ? <Link href={t.source.href}>{t.source.label}</Link> : <a href={t.source.href} target="_blank" rel="noreferrer">{t.source.label}</a>}
            </article>
          ))}
        </div>
        <p className="compare-note">Why it matters: in a CDC study of sepsis patients at four New York hospitals, sepsis began outside the hospital for nearly 80% of them (<a className="underline underline-offset-2" href="https://www.cidrap.umn.edu/sepsis/cdc-urges-fast-action-preventing-treating-sepsis" target="_blank" rel="noreferrer">CDC Vital Signs, 2016</a>). Every timeline also compares the AI warning with NEWS2, the checklist score nurses use, on the same four vitals. If the AI can&apos;t warn earlier than a simple checklist, it isn&apos;t adding anything.</p>
      </section>

      <section className="project-section" aria-labelledby="details-title">
        <div className="project-section-heading"><h2 id="details-title">Understanding your workspace</h2><p>A few details to help you read the monitor and explore a timeline.</p></div>
        <div className="project-details">
          <details><summary>How should I interpret the risk score?</summary><p>Scores run from 0 to 1. The current thresholds are {RISK_THRESHOLDS.yellow.toFixed(2)} for elevated and {RISK_THRESHOLDS.red.toFixed(2)} for high. A score is not a percentage chance of sepsis or a diagnosis. Read it alongside the trend and the available observations.</p></details>
          <details><summary>What does a timeline show?</summary><p>Each timeline connects hourly observations with a risk score. Play it in sequence, drag to a particular hour, or jump to a warning. The result compares the first high score with the onset time included in the record. Timelines labeled synthetic use invented data.</p></details>
          <details><summary>What happens when a reading is missing?</summary><p>Missing measurements stay marked as missing in the observation table. A vital tile may show the last available measurement with its age. The charts preserve gaps instead of inventing measurements.</p></details>
        </div>
      </section>

      <section className="project-next" aria-labelledby="next-title"><div><h2 id="next-title">See how the picture changes.</h2><p>Follow the observations from the first reading to the latest score.</p></div><Link href="/replay" className="button button-primary">Explore timelines<Icon name="arrow" size={16} /></Link></section>
    </div>
  );
}
