import type { Metadata } from "next";
import { LiveMonitor } from "@/components/LiveMonitor";

export const metadata: Metadata = { title: "Monitor" };

export default function MonitorPage() {
  return <LiveMonitor />;
}
