import type { NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/", "/about", "/login", "/signup", "/forgot-password", "/update-password",
    "/monitor/:path*", "/replay/:path*", "/research/:path*", "/prototype/:path*",
  ],
};
