import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "./config";
import { hasConfirmedAccount, isProtectedPath } from "../auth/routeAccess";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = getSupabaseConfig();
  let authorized = false;
  if (config) {
    try {
      const client = createServerClient(config.url, config.key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          for (const { name, value } of values) request.cookies.set(name, value);
          const previous = response.cookies.getAll();
          response = NextResponse.next({ request });
          for (const cookie of previous) response.cookies.set(cookie);
          for (const { name, value, options } of values) response.cookies.set(name, value, options);
        },
      },
      });
      const { data, error } = await client.auth.getUser();
      authorized = !error && hasConfirmedAccount(data.user);
    } catch {
      // An unavailable auth service must never grant workspace access.
    }
  }
  if (isProtectedPath(request.nextUrl.pathname) && !authorized) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    const redirect = NextResponse.redirect(login);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    response = redirect;
  }
  // Session-bearing responses must never be shared through a CDN.
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}
