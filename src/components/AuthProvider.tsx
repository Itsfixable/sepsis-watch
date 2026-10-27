"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { hasConfirmedAccount, isProtectedPath } from "@/lib/auth/routeAccess";

type AuthState = { signedIn: boolean; ready: boolean };
const AuthContext = createContext<AuthState>({ signedIn: false, ready: false });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ signedIn: false, ready: !hasSupabaseConfig() });
  useEffect(() => {
    if (!hasSupabaseConfig()) return;
    const client = getSupabaseBrowserClient();
    let active = true;
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      setState({ signedIn: hasConfirmedAccount(session?.user ?? null), ready: true });
      if (event === "SIGNED_OUT" && isProtectedPath(window.location.pathname)) {
        window.location.replace("/about");
      }
    });
    // A history restoration re-runs the server access check.
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted && isProtectedPath(window.location.pathname)) window.location.reload();
    };
    window.addEventListener("pageshow", restored);
    return () => {
      active = false;
      subscription.unsubscribe();
      window.removeEventListener("pageshow", restored);
    };
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
