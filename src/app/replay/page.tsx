import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";
import { PatientStory } from "@/components/PatientStory";
import { loadReplays } from "@/lib/replays";

export const metadata: Metadata = {
  title: "Timelines",
};

export default async function PrototypePage() {
  await requireUser("/replay");
  return <PatientStory replays={loadReplays().filter((record) => record.source === "synthetic")} />;
}
