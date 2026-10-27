import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

export async function getSupabaseServerClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Account access is not configured.");
  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        // Server Components cannot write cookies. Proxy refreshes them first;
        // route handlers (such as the auth callback) can write them here.
        try {
          for (const { name, value, options } of values) cookieStore.set(name, value, options);
        } catch {
          // Read-only render context.
        }
      },
    },
  });
}
