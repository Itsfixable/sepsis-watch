import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import { PatientStory } from "@/components/PatientStory";
import { loadReplays } from "@/lib/replays";

export const metadata: Metadata = {
  title: "Patient story · UI prototype",
  robots: { index: false, follow: false },
};

export default async function PrototypePage() {
  return <PatientStory replays={loadReplays().filter((record) => record.source === "synthetic")} />;
}
