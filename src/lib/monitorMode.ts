/** Server-side policy: the unauthenticated API is for an explicit local dev demo only. */
export function localReadingsEnabled(env: { NODE_ENV?: string; SEPSISWATCH_LOCAL_API?: string; VERCEL?: string } = process.env): boolean {
  return env.NODE_ENV === "development" && env.SEPSISWATCH_LOCAL_API === "1" && !env.VERCEL;
}
