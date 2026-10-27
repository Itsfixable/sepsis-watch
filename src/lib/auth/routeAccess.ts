const protectedRoots = ["/monitor", "/replay", "/research", "/prototype", "/update-password"];
export function isProtectedPath(pathname: string): boolean {
  return protectedRoots.some((root) => pathname === root || pathname.startsWith(root + "/"));
}

export function safeReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\s%]/.test(value)) return "/replay";
  try {
    const url = new URL(value, "https://sepsiswatch.invalid");
    if (url.origin !== "https://sepsiswatch.invalid" || !isProtectedPath(url.pathname)) return "/replay";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/replay";
  }
}

export function hasConfirmedAccount(user: { email_confirmed_at?: string | null; is_anonymous?: boolean } | null): boolean {
  return Boolean(user?.email_confirmed_at && !user.is_anonymous);
}
