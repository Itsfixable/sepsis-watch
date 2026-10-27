export function getSupabaseConfig(): { url: string; key: string } | null {
  // Explicit access allows Next.js to inline only these public values.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key || key.startsWith("sb_secret_")) return null;
  try {
    const parsed = new URL(url);
    const localHttp = parsed.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if ((parsed.protocol !== "https:" && !localHttp) || parsed.username || parsed.password ||
        parsed.search || parsed.hash || parsed.pathname !== "/") return null;
    return { url: parsed.origin, key };
  } catch {
    return null;
  }
}

export function hasSupabaseConfig(): boolean {
  return getSupabaseConfig() !== null;
}
