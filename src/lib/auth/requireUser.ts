import "server-only";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "../supabase/server";
import { hasSupabaseConfig } from "../supabase/config";
import { hasConfirmedAccount, safeReturnPath } from "./routeAccess";

export async function requireUser(returnPath: string) {
  let authorized = false;
  if (hasSupabaseConfig()) {
    try {
      const client = await getSupabaseServerClient();
      const { data, error } = await client.auth.getUser();
      authorized = !error && hasConfirmedAccount(data.user);
    } catch {
      // Fail closed when configuration or the auth service is unavailable.
    }
  }
  if (!authorized) redirect("/login?next=" + encodeURIComponent(safeReturnPath(returnPath)));
}
