import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { requireUser } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New password", robots: { index: false, follow: false } };
export default async function UpdatePasswordPage() {
  await requireUser("/update-password");
  return <AuthForm mode="update" />;
}
