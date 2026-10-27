"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { hasConfirmedAccount, safeGuestReturnPath, safeReturnPath } from "@/lib/auth/routeAccess";
import styles from "./AuthForm.module.css";

type Mode = "login" | "signup" | "forgot" | "update";
const copy = {
  login: { title: "Welcome back.", intro: "Sign in to your account, or continue as a guest to explore the research workspace.", button: "Sign in" },
  signup: { title: "Create your account.", intro: "Registration is optional. You can explore the research workspace as a guest.", button: "Create account" },
  forgot: { title: "Reset your password.", intro: "Enter your email to request a password reset link.", button: "Send reset link" },
  update: { title: "Choose a new password.", intro: "Use a unique password with at least 12 characters.", button: "Save password" },
};

export function AuthForm({ mode, nextPath = "/replay", linkError = false }: { mode: Mode; nextPath?: string; linkError?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(linkError ? "This link has expired or could not be verified. Sign in or request a new reset link in this browser." : "");
  const configured = hasSupabaseConfig();
  const next = safeReturnPath(nextPath);
  const text = copy[mode];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !configured) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if ((mode === "signup" || mode === "update") && (password.length < 12 || password !== form.get("confirm"))) {
      setError("Use at least 12 characters and enter the same password twice.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const client = getSupabaseBrowserClient();
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", mode === "forgot" ? "/update-password" : next);
      if (mode === "login") {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error || !hasConfirmedAccount(data.user)) {
          setError("Unable to sign in. Check your email, password and email confirmation, then try again.");
        } else {
          window.location.assign(next);
          return;
        }
      } else if (mode === "signup") {
        const { error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: callback.href } });
        if (error) setError("Unable to complete registration. Try again later, or sign in if you already have an account.");
        else setMessage("Check your inbox. If registration can be completed, you will receive a confirmation link. Open it in this browser, then sign in.");
      } else if (mode === "forgot") {
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: callback.href });
        if (error) setError("Unable to send a reset request right now. Please try again later.");
        else setMessage("If an account exists for that email, a reset link will arrive shortly. Open it in this browser.");
      } else {
        const { error } = await client.auth.updateUser({ password });
        if (error) setError("Unable to update your password. Request a new reset link and try again.");
        else setMessage("Your password has been updated. You can return to the workspace.");
      }
    } catch {
      setError("Could not connect to the account service. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <section className={styles.shell} aria-labelledby="auth-title">
    <div className={styles.card}>
      <p className={styles.eyebrow}>SepsisWatch · Account</p>
      <h1 id="auth-title">{text.title}</h1>
      <p className={styles.intro}>{text.intro}</p>
      {(mode === "login" || mode === "signup") && <div className={styles.guest}>
        <Link className={styles.guestLink} href={safeGuestReturnPath(nextPath)}>Continue as guest</Link>
        <p className={styles.hint}>Explore sample timelines and research. No account or email verification required.</p>
      </div>}
      {!configured ? <div className={styles.notice} role="status">Account access is being configured. Please try again later. You can still read the <Link href="/about">Overview</Link>.</div> :
        <form onSubmit={submit} className={styles.form}>
          {mode !== "update" && <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} disabled={busy} /></label>}
          {mode !== "forgot" && <label>{mode === "update" ? "New password" : "Password"}<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "login" ? undefined : 12} maxLength={128} required disabled={busy} aria-describedby={mode === "login" ? undefined : "password-help"} /></label>}
          {(mode === "signup" || mode === "update") && <>
            <p id="password-help" className={styles.hint}>At least 12 characters. Choose a password you do not use elsewhere.</p>
            <label>Confirm password<input name="confirm" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy} /></label>
          </>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          {message && <p className={styles.notice} role="status">{message}</p>}
          <button type="submit" className={styles.submit} disabled={busy}>{busy ? "Please wait…" : text.button}</button>
        </form>}
      <div className={styles.links}>
        {mode === "login" && <><Link href={"/signup?next=" + encodeURIComponent(next)}>Create an account</Link><Link href="/forgot-password">Forgot password?</Link></>}
        {mode !== "login" && <Link href={"/login?next=" + encodeURIComponent(next)}>Back to sign in</Link>}
        {mode === "update" && message && <Link href="/replay">Return to workspace</Link>}
      </div>
      {mode === "signup" && <p className={styles.hint}>Your email and account credentials are handled by Supabase for sign-in. Session cookies keep you signed in. Do not enter patient information.</p>}
      <p className={styles.footnote}>Access to a student research prototype. Not validated for medical use.</p>
    </div>
    <Link className={styles.back} href="/about">← Back to Overview</Link>
  </section>;
}
