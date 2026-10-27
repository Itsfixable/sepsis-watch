import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false } };
export default function ForgotPasswordPage() { return <AuthForm mode="forgot" />; }
