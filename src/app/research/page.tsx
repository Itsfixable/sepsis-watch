import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";
import Link from "next/link";
import { ResearchExplorer } from "@/components/ResearchExplorer";
import styles from "@/components/ResearchExplorer.module.css";
import { loadResearchBundle } from "@/lib/researchData";
import type { Evaluation } from "@/lib/research";

export const metadata: Metadata = { title: "Research", description: "A reproducible four-vital model experiment on held-out PhysioNet ICU records, with false alarms, missed cases and explicit limitations." };
const format = (n: number | null, digits = 3) => n === null ? "Not available" : n.toFixed(digits);
const count = (n: number) => n.toLocaleString("en-US");
const fraction = (a: number | null, b: number) => a === null ? "Not available" : `${count(a)} / ${count(b)}`;
const source = "https://github.com/Itsfixable/sepsis-watch/tree/main";

function Results({ a, b }: { a: Evaluation; b: Evaluation }) {
  const rows: [string, (e: Evaluation) => string][] = [
    ["Eligible stays · septic / non-septic", e => `${count(e.patients)} · ${count(e.septicStays)} / ${count(e.nonSepticStays)}`],
    ["Eligible hours · positive targets", e => `${count(e.eligibleHours)} · ${count(e.positiveHours)} (${format(e.prevalence * 100, 2)}%)`],
    ["Scored / eligible hours", e => fraction(e.scoredHours, e.eligibleHours)],
    ["AUROC · higher is better", e => format(e.auroc)],
    ["Average precision · higher is better", e => format(e.averagePrecision)],
    ["Constant baseline · AUROC / average precision", e => `${format(e.baselineAuroc)} / ${format(e.baselineAveragePrecision)}`],
    ["Brier score · lower is better", e => format(e.brier, 4)],
    ["Constant baseline · Brier score", e => format(e.baselineBrier, 4)],
    ["Detected septic stays / eligible septic stays", e => fraction(e.detectedStays, e.septicStays)],
    ["Missed septic stays / eligible septic stays", e => fraction(e.missedStays, e.septicStays)],
    ["Non-septic stays with any alert / non-septic stays", e => fraction(e.falseAlarmStays, e.nonSepticStays)],
    ["False-positive hours / eligible negative hours", e => fraction(e.falsePositiveHours, e.negativeHours)],
    ["False-positive hours per 100 eligible negative hours", e => format(e.falsePositiveHoursPer100, 2)],
    ["Unscored hours · positive / negative", e => `${count(e.unscoredHours)} · ${count(e.unscoredPositiveHours)} / ${count(e.unscoredNegativeHours)}`],
  ];
  return <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Held-out evaluation results, scroll horizontally if needed"><table>
    <caption>Fixed model and threshold. Neither test cohort was used for fitting or threshold selection.</caption>
    <thead><tr><th scope="col">Measure</th><th scope="col">Hospital A · internal test</th><th scope="col">Hospital B · external test</th></tr></thead>
    <tbody>{rows.map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{value(a)}</td><td>{value(b)}</td></tr>)}</tbody>
  </table></div>;
}

export default async function ResearchPage() {
  await requireUser("/research");
  const { report, records, modelSha256, imputation } = loadResearchBundle();
  return <div className={styles.page}>
    <header className={styles.hero}><Link href="/about">← Back to Overview</Link><p className={styles.eyebrow} style={{ marginTop: 28 }}>SepsisWatch / Research notebook</p>
      <h1>Four vitals.<br />A testable starting point.</h1>
      <p>Explore a logistic-regression model trained on PhysioNet ICU records.</p>
    </header>
    <ResearchExplorer records={records} threshold={report.threshold} imputation={imputation} />
    <details id="evaluation-details" className={styles.evaluationDetails}>
      <summary>Model evaluation and limitations</summary>
    <aside className={styles.notice}><strong>Research only.</strong> Retrospective ICU data cannot establish safety, accuracy at home, or benefit to patients. Outputs are uncalibrated experimental scores, not individual sepsis likelihoods. The <Link href="/monitor">Monitor</Link> and <Link href="/replay">Timelines</Link> still use simulated patient records and illustrative scores. No sensor or live clinical model is connected.</aside>
    <section className={styles.section} aria-labelledby="results-title"><div className={styles.sectionHead}><div><p className={styles.eyebrow}>02 / Model evaluation</p><h2 id="results-title">Evaluation results</h2>
      <p>Training used {count(report.trainingPatients)} hospital A stays. Validation used {count(report.validation.patients)} different stays for threshold selection. Hospital B was kept entirely outside development.</p></div></div>
      {report.threshold === null
        ? <p className={styles.notice}><strong>No threshold met the validation target.</strong> Threshold-dependent outcomes were not evaluated: detected stays, missed stays and false alerts are unavailable, not zero. Ranking and score-error results remain in the table below. No working alert threshold is claimed.</p>
        : <p className={styles.notice}><strong>This threshold generates too many false alerts for clinical use.</strong> In the external test, {fraction(report.externalTest.falseAlarmStays, report.externalTest.nonSepticStays)} non-septic stays had an alert ({format(report.externalTest.falseAlarmStays === null || report.externalTest.nonSepticStays === 0 ? null : 100 * report.externalTest.falseAlarmStays / report.externalTest.nonSepticStays, 1)}%), while {report.externalTest.missedStays === null ? "an unavailable number of" : count(report.externalTest.missedStays)} septic stays were missed. This is an initial baseline to improve and independently validate—not a deployable clinical predictor.</p>}
      <p className={styles.tableHint}>Scroll sideways in the table to compare both hospitals. Keyboard: focus the table region and use the arrow keys.</p>
      <Results a={report.internalTest} b={report.externalTest} />
      <p className={styles.small}>Selection rule: choose the highest 0.01-spaced threshold detecting at least 80% of eligible septic validation stays during their six-hour positive window. {report.threshold === null ? "No threshold was selected." : `Selected threshold: ${report.threshold.toFixed(2)} (${fraction(report.validation.detectedStays, report.validation.septicStays)} validation stays detected).`} This target is an experiment setting, not a medical recommendation. A missed stay includes a positive window with no score. An alert on a negative hour counts as a false-positive hour, including early hours in a later septic stay.</p>
      <div className={styles.methodGrid}>
        <article><h3>Ranking is not accuracy.</h3><p>AUROC measures ranking across thresholds. Average precision summarizes the precision–recall curve for the rare positive hourly target. Neither number shows that the tool improves care.</p></article>
        <article><h3>Compare with doing very little.</h3><p>The baseline outputs the training-set prevalence ({format(report.trainingPrevalence * 100, 2)}%) for every scored hour. Brier score is mean squared error. A simple baseline can have a low Brier score when events are rare; inspect misses and false alarms too.</p></article>
        <article><h3>Missingness stays visible.</h3><p>Ranking and Brier metrics exclude unscored hours; their counts remain visible. False-positive-hour rates use all eligible negative hours, including unscored ones. Hours from one patient are correlated. These are descriptive estimates without confidence intervals.</p></article>
      </div>
    </section>
    </details>
    <section className={styles.section} aria-labelledby="methods-title"><div className={styles.sectionHead}><div><p className={styles.eyebrow}>03 / Make it reproducible</p><h2 id="methods-title">Methods, not a black box.</h2><p>One fixed experiment. No tuning against the published test results.</p></div></div>
      <div className={styles.explorer}><div className={styles.notes}>
        <details><summary>Training, inputs and leakage controls</summary><p>Hospital A was split by patient record into 70% training, 15% validation and 15% internal test, stratified by outcome with seed 2026. All eligible hospital B stays form the external test. Duplicate IDs and byte-identical source records are rejected across partitions. Distinct admissions belonging to the same person cannot be identified from the released IDs.</p>
          <p>Only heart rate, breathing rate, temperature and oxygen saturation enter the model. Each contributes its latest valid value (up to six hours old), its age, and a current-hour availability flag: 12 features. Median imputation and standardization are fitted on scored training hours only. Logistic regression uses L2 regularization, C=1, no class weighting and no oversampling. No demographics, blood tests, future values or outcome labels are input features. This model has not been calibrated for individual clinical risk.</p></details>
        <details><summary>What the target means and which records were excluded</summary><p>PhysioNet 2019 already marks the six hours before inferred sepsis onset as positive. We add six to the first positive row index to recover the inferred onset, then exclude onset and all later hours. For all-negative stays, the final six hours are omitted for insufficient follow-up. First-row-positive stays, inconsistent labels or hour sequences, and stays without an observed onset or enough follow-up are excluded. These exclusions change the evaluation population and can bias results.</p>
          <p>Hour zero is the first recorded row, not necessarily ICU admission. The source ICU-hour field must contain consecutive positive integers; a later starting hour is allowed. Bounds are data-quality filters, not normal ranges: heart rate 20–250, breathing 2–80, temperature 25–45 °C, saturation 50–100%. Nonfinite or out-of-range values become unavailable.</p>
          {(["A", "B"] as const).map(name => <p key={name}><strong>Hospital {name}:</strong> {count(report.exclusions[name].rawPatients)} source records, {count(report.exclusions[name].rawHours)} source hours, {count(report.exclusions[name].invalidValues)} out-of-range values treated as unavailable. Excluded records: {Object.entries(report.exclusions[name].reasons).map(([reason, total]) => `${reason.replaceAll("_", " ")}: ${count(total)}`).join("; ") || "none"}.</p>)}</details>
        <details><summary>Score reliability by bin</summary><p>Observed six-hour target frequency versus average score, for scored hours only. This table describes calibration; it does not calibrate the model. Empty bins have no estimate.</p>
          <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Score reliability table"><table><thead><tr><th scope="col">Score bin</th><th scope="col">Hospital A · n / mean / target rate</th><th scope="col">Hospital B · n / mean / target rate</th></tr></thead><tbody>
            {report.internalTest.reliability.map((bin, i) => <tr key={bin.from}><th scope="row">{bin.from.toFixed(1)}–{bin.to.toFixed(1)}{i === 9 ? " (inclusive)" : " (upper excluded)"}</th>{[bin, report.externalTest.reliability[i]].map((value, j) => <td key={j}>{count(value.count)} / {format(value.meanScore)} / {format(value.eventRate)}</td>)}</tr>)}
          </tbody></table></div></details>
        <details><summary>Source, license and exported model</summary><p>Data: Reyna et al., <a href="https://physionet.org/content/challenge-2019/1.0.0/">PhysioNet/Computing in Cardiology Challenge 2019, version 1.0.0</a>, DOI <a href="https://doi.org/10.13026/v64v-d857">10.13026/v64v-d857</a>. Hosted by PhysioNet; downloaded from its documented public S3 mirror. The examples contain only four de-identified vital-sign columns, their row times and derived model scores.</p>
          <p>The source metadata lists <a href="https://physionet.org/content/challenge-2019/view-license/1.0.0/">CC BY 4.0</a>, while the distributed <a href="https://physionet.org/files/challenge-2019/1.0.0/LICENSE.txt">LICENSE.txt</a> states ODbL 1.0. Both notices are preserved in the repository; the derived research database is offered under ODbL 1.0. No private patient data was uploaded to an AI service.</p>
          <p className={styles.source}>Model SHA-256: {modelSha256}</p><p><a href={`${source}/data/research`}>Model, complete report and source notices</a> · <a href={`${source}/scripts/research`}>Training and evaluation code</a>. Predictions are computed offline and bundled, not generated in your browser. Gemini is not enabled.</p></details>
      </div></div>
    </section>
  </div>;
}
