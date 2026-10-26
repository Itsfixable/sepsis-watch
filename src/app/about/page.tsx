import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ProjectPreview } from "@/components/ProjectPreview";
import { loadReplays } from "@/lib/replays";
import { RISK_THRESHOLDS } from "@/lib/thresholds";

export const metadata: Metadata = {
  title: "Overview",
  description: "Explore synthetic patient timelines and illustrative scores in the SepsisWatch research prototype.",
};

type Tool = { name: string; who: string; where: string; needs: string; evidence: string; source: { label: string; href: string }; ours?: boolean };

// Sources checked on 2026-10-25. Studies concern specific versions and settings.
const TOOLS: Tool[] = [
  {
    name: "TREWS",
    who: "Johns Hopkins",
    where: "Inside the hospital",
    needs: "The patient's electronic chart, including lab results",
    evidence: "A five-hospital observational study associated earlier clinician confirmation of alerts with better outcomes. It did not establish cause and effect.",
    source: { label: "Nature Medicine study, 2022", href: "https://pubmed.ncbi.nlm.nih.gov/35864252/" },
  },
  {
    name: "Sepsis ImmunoScore",
    who: "Prenosis",
    where: "Emergency department or hospital",
    needs: "Up to 22 chart inputs, including vital signs and laboratory results",
    evidence: "FDA-authorized for specified patients with suspected sepsis, alongside clinical assessment. It is not a continuous monitoring system.",
    source: { label: "FDA decision summary", href: "https://www.accessdata.fda.gov/cdrh_docs/reviews/DEN230036.pdf" },
  },
  {
    name: "Epic Sepsis Model",
    who: "Epic Systems",
    where: "Inside the hospital records system",
    needs: "The patient's electronic chart",
    evidence: "A 2026 study evaluated an updated model across multiple hospitals. Performance and alert thresholds varied by site; results depend on the version and setting.",
    source: { label: "JAMA Network Open study, 2026", href: "https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2845595" },
  },
  {
    name: "SepsisWatch",
    who: "Student prototype (this project)",
    where: "In your browser, with synthetic demo records",
    needs: "Invented heart rate, breathing rate, temperature and oxygen readings, plus illustrative scores",
    evidence: "Working interface and local API demonstration. No trained prediction model or bedside sensor is connected to this app. No clinical performance has been established.",
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
          <h1 id="project-title">See changing vitals<br />in context.</h1>
          <p className="project-lead">Explore four vital signs, their history, and illustrative warning scores in one view. This research prototype uses synthetic patients to demonstrate the software.</p>
          <div className="project-actions"><Link className="button button-primary" href="/monitor">Open monitor<Icon name="arrow" size={16} /></Link><Link className="button" href="/replay">Explore timelines</Link></div>
        </div>
        <ProjectPreview replays={replays} />
      </section>

      <section className="project-purpose" aria-labelledby="purpose-title">
        <h2 id="purpose-title">Every reading has a history.</h2>
        <p>Compare a current observation with earlier readings, inspect missing measurements, and follow changes over time. SepsisWatch explores how a future monitoring interface could help people review those changes; this demo does not establish that it can detect sepsis.</p>
      </section>

      <section className="project-section" aria-labelledby="system-title">
        <div className="project-section-heading"><h2 id="system-title">One workspace. The whole timeline.</h2><p>Follow a synthetic stream or explore a patient story at your own pace.</p></div>
        <ol className="system-flow">
          <li><Icon name="activity" size={25} /><h3>Inspect four vitals</h3><p>Review heart rate, breathing rate, temperature and oxygen saturation at the selected simulated hour.</p></li>
          <li><Icon name="signal" size={25} /><h3>Follow the demo stream</h3><p>The Monitor starts with 24 observations and reveals one more every three seconds. Pause, restart or choose another patient.</p></li>
          <li><Icon name="monitor" size={25} /><h3>Explore illustrative scores</h3><p>See demo thresholds and score changes. The supplied values are not predictions from a trained model.</p></li>
          <li><Icon name="replay" size={25} /><h3>Revisit key moments</h3><p>Move through a patient timeline, jump to the first warning, and inspect the observations behind each point.</p></li>
        </ol>
      </section>

      <section className="project-section" aria-labelledby="compare-title">
        <div className="project-section-heading"><h2 id="compare-title">Clinical tools and this prototype</h2><p>These tools have different inputs, intended uses and evidence. SepsisWatch demonstrates a four-vital interface with synthetic data. These descriptions are context, not a head-to-head performance comparison.</p></div>
        <div className="compare-grid">
          {TOOLS.map((t) => (
            <article key={t.name} className="compare-card" data-ours={t.ours || undefined}>
              <div><h3>{t.name}</h3><p className="compare-who">{t.who}</p></div>
              <dl>
                <dt>Setting</dt><dd>{t.where}</dd>
                <dt className="mt-3">Inputs</dt><dd>{t.needs}</dd>
                <dt className="mt-3">Evidence and limits</dt><dd>{t.evidence}</dd>
              </dl>
              {t.ours ? <Link href={t.source.href}>{t.source.label}</Link> : <a href={t.source.href} target="_blank" rel="noreferrer">{t.source.label}</a>}
            </article>
          ))}
        </div>
        <p className="compare-note">The <Link className="underline underline-offset-2" href="/replay/classic">detailed comparison</Link> includes a four-vital NEWS2 comparison (partial score). It omits blood pressure, consciousness or new confusion, and supplemental oxygen use; it uses oxygen saturation scale 1. This is not the full clinical NEWS2 score. Earlier threshold crossings in invented scenarios do not establish accuracy or clinical benefit. See the <a className="underline underline-offset-2" href="https://www.rcp.ac.uk/resources/national-early-warning-score-news-2/" target="_blank" rel="noreferrer">Royal College of Physicians guidance</a>.</p>
      </section>

      <section className="project-section" aria-labelledby="details-title">
        <div className="project-section-heading"><h2 id="details-title">Understanding your workspace</h2><p>A few details to help you read the monitor and explore a timeline.</p></div>
        <div className="project-details">
          <details><summary>How should I interpret the score?</summary><p>Demo scores run from 0 to 1, with illustrative thresholds of {RISK_THRESHOLDS.yellow.toFixed(2)} and {RISK_THRESHOLDS.red.toFixed(2)}. They are not probabilities or validated predictions. A low score does not mean someone is well; seek medical help if someone seems seriously unwell, regardless of this display.</p></details>
          <details><summary>What does a timeline show?</summary><p>Explore synthetic hourly observations, inspect a vital&apos;s trend, and compare current readings with the initial reference. Use playback or the chapter shortcuts to choose an hour. The detailed comparison also shows threshold crossings against a simulated onset time.</p></details>
          <details><summary>What happens when a reading is missing?</summary><p>The public Monitor and patient story leave a missing current reading blank and label any earlier value with its age. Their vital-sign charts preserve gaps. The detailed NEWS2 comparison carries the last available value forward for each vital, so its inputs may be older than the selected hour.</p></details>
          <details><summary>Are the model and hardware connected?</summary><p>No. The public site uses bundled synthetic observations and illustrative scores. A Python script can demonstrate API ingestion on localhost; production accepts no readings. A trained model and bedside sensor remain future work, with clinical evaluation needed before any patient-care use.</p></details>
        </div>
      </section>

      <section className="project-next" aria-labelledby="next-title"><div><h2 id="next-title">See how the picture changes.</h2><p>Follow the observations from the first reading to the latest score.</p></div><Link href="/replay" className="button button-primary">Explore timelines<Icon name="arrow" size={16} /></Link></section>
    </div>
  );
}
