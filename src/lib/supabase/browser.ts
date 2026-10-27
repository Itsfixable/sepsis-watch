import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

export function getSupabaseBrowserClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Account access is not configured.");
  return createBrowserClient(config.url, config.key);
}
