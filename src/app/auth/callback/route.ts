import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { hasSupabaseConfig } from "../../../lib/supabase/config";
import { safeReturnPath } from "../../../lib/auth/routeAccess";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  let destination = "/login?error=link";
  if (code && hasSupabaseConfig()) {
    try {
      const client = await getSupabaseServerClient();
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) destination = safeReturnPath(url.searchParams.get("next"));
    } catch {
      // Expired, reused, and unavailable links share the same recovery path.
    }
  }
  const response = NextResponse.redirect(new URL(destination, url.origin), 303);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
