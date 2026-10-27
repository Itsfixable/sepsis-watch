import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import { LiveMonitor } from "@/components/LiveMonitor";
import { DemoMonitor } from "@/components/DemoMonitor";
import { localReadingsEnabled } from "@/lib/monitorMode";
import { demoRecords } from "@/lib/demoMonitor";
import { loadReplays } from "@/lib/replays";

export const metadata: Metadata = { title: "Monitor" };

export default async function MonitorPage() {
  return localReadingsEnabled() ? <LiveMonitor /> : <DemoMonitor records={demoRecords(loadReplays())} />;
}
