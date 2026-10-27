const workspaceRoots = ["/monitor", "/replay", "/research", "/prototype"];
const protectedRoots = ["/update-password"];
export function isProtectedPath(pathname: string): boolean {
  return protectedRoots.some((root) => pathname === root || pathname.startsWith(root + "/"));
}

export function safeReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\s%]/.test(value)) return "/replay";
  try {
    const url = new URL(value, "https://sepsiswatch.invalid");
    const allowed = [...workspaceRoots, ...protectedRoots].some((root) => url.pathname === root || url.pathname.startsWith(root + "/"));
    if (url.origin !== "https://sepsiswatch.invalid" || !allowed) return "/replay";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/replay";
  }
}

export function safeGuestReturnPath(value: unknown): string {
  const path = safeReturnPath(value);
  return isProtectedPath(new URL(path, "https://sepsiswatch.invalid").pathname) ? "/replay" : path;
}

export function hasConfirmedAccount(user: { email_confirmed_at?: string | null; is_anonymous?: boolean } | null): boolean {
  return Boolean(user?.email_confirmed_at && !user.is_anonymous);
}
