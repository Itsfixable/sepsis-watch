import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { ReplayPlayer } from "@/components/ReplayPlayer";
import { loadReplays } from "@/lib/replays";

export const metadata: Metadata = { title: "Timelines" };

export default function ReplayPage() {
  const replays = loadReplays();
  return (
    <div className="page-shell">
      <div className="breadcrumb"><span>Workspace</span><Icon name="chevron" size={11} /><span>Timelines</span></div>
      <div className="page-heading">
        <div><h1>Patient timelines</h1><p className="page-description">SepsisWatch brings vital signs and sepsis risk trends together. Start a replay to follow how a patient&apos;s condition changes.</p></div>
        <span className="replay-heading-tag"><Icon name="replay" size={14} />{replays.length} patient records</span>
      </div>
      <ol className="workflow-strip" aria-label="How SepsisWatch works">
        <li><strong>Measure</strong><span>Follow heart rate, breathing, temperature, and oxygen.</span></li>
        <li><strong>Score</strong><span>See how the supplied risk score changes over time.</span></li>
        <li><strong>Act</strong><span>Review a warning and the observations behind it.</span></li>
      </ol>
      <ReplayPlayer replays={replays} />
    </div>
  );
}
