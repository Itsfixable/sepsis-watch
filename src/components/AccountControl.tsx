"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AccountControl() {
  const { signedIn, ready } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  if (!ready) return <span className="account-status" aria-label="Checking account">Account…</span>;
  if (!signedIn) return <Link className="account-link" href="/login">Sign in</Link>;
  return <div className="account-control">
    <button className="account-link" disabled={busy} onClick={async () => {
      setBusy(true);
      setError(false);
      try {
        const { error } = await getSupabaseBrowserClient().auth.signOut({ scope: "local" });
        if (error) throw error;
        window.location.replace("/about");
      } catch {
        setError(true);
        setBusy(false);
      }
    }}>{busy ? "Signing out…" : "Sign out"}</button>
    {error && <span role="alert" className="account-error">Could not sign out. Try again.</span>}
  </div>;
}
