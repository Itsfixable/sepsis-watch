# Supabase Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add real Supabase email/password accounts and require authentication for SepsisWatch's interactive pages while keeping the Overview page public.

**Architecture:** Use Supabase Auth with browser and server clients. A server-side session check protects `/monitor`, `/replay`, `/research`, and `/prototype`; `/about` and the auth pages remain public. A client provider listens for auth changes, and the shared header exposes sign-in state and sign-out.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, `@supabase/ssr`, `@supabase/supabase-js`, Vitest-free Node tests already used by the repository, and Vercel environment variables.

**Spec:** `docs/superpowers/specs/2026-10-26-supabase-auth-design.md`

## Implementation record

- Implemented directly in the existing isolated worktree on `account-access`,
  based on `origin/main` at `d60be44`.
- Ruling: use Next.js 16 `src/proxy.ts`, replacing the plan's deprecated
  middleware convention. A shared guard also runs inside each protected page;
  all protected pages explicitly use dynamic rendering.
- Ruling: add `/auth/callback` and protected `/update-password` to complete email
  confirmation and password recovery. Require confirmed, non-anonymous users.
- Ruling: use `AccountControl` for header sign-out; keep form-specific CSS in a
  module and combine the cohesive feature in one commit.
- Auth redirect/session/callback tests and UI rendering tests accompany the change.
  Existing research-page rendering tests now await their async server page.
  Renamed a test-local variable in riskStroke.test.mjs to resolve an existing lint error.
- Independent review found malformed environment URLs could crash public pages.
  Added a failing regression test, validated shared configuration, and moved
  client creation inside the proxy error handler.
- No Supabase project configuration is present. Hosted registration, email
  delivery, recovery and session-refresh verification remain pending. Keep the
  PR draft and follow docs/AUTH.md before production deployment.
- Dependency audit reports existing Next.js and Zod advisories. These predate
  authentication and require a separate framework/dependency update before deployment.

## Global Constraints

- Keep `/about` public.
- Protect `/monitor`, `/replay`, `/research`, and `/prototype` in application code.
- Never expose a Supabase service-role key to the browser.
- Do not move or alter bundled simulated records or exported research results.
- Do not collect real patient information.
- Keep authentication copy clear that the project is a student research prototype.

## Review Focus

- Missing environment variables: show a configuration error instead of a blank page.
- Expired sessions: refresh or redirect cleanly to `/login`.
- Deep links: preserve a safe internal return path after sign-in.
- Invalid credentials and unknown emails: use non-enumerating error copy.
- Sign-out and back-button behavior: protected pages must not remain accessible after session removal.

### Task 1: Add Supabase dependencies and client helpers

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/supabase/browser.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/config.ts`
- Modify: `.env.example` or create it if absent

**Interfaces:**
- `getSupabaseBrowserClient(): SupabaseClient`
- `getSupabaseServerClient(): Promise<SupabaseClient>`
- `hasSupabaseConfig(): boolean`

- [ ] Add `@supabase/ssr` and `@supabase/supabase-js` at versions compatible with the current Next.js release.
- [ ] Implement browser and server clients using only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- [ ] Make missing configuration detectable without throwing during public Overview rendering.
- [ ] Document local and Vercel environment variables without writing secrets.
- [ ] Run `npm install`, `npm run lint`, and `npx tsc --noEmit --incremental false`.
- [ ] Commit as `feat: add auth clients`.

### Task 2: Add session refresh and protected-route middleware

**Files:**
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/middleware.ts`
- Create: `src/lib/auth/routeAccess.ts`
- Test: `tests/routeAccess.test.mjs`

**Interfaces:**
- `isProtectedPath(pathname: string): boolean`
- `safeReturnPath(value: string | null): string`

- [ ] Write tests covering protected paths, public auth paths, external return URLs, and query-string preservation.
- [ ] Implement a Supabase middleware client that refreshes the auth cookie and reads the current user.
- [ ] Redirect unauthenticated users from protected paths to `/login?next=<safe-internal-path>`.
- [ ] Leave `/about`, `/`, `/login`, `/signup`, and `/forgot-password` public.
- [ ] Exclude static assets, image files, and API routes from the matcher unless explicitly needed.
- [ ] Run the route-access tests and typecheck.
- [ ] Commit as `feat: protect app routes`.

### Task 3: Build authentication screens and session provider

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/signup/page.tsx`
- Create: `src/app/forgot-password/page.tsx`
- Create: `src/components/AuthForm.tsx`
- Create: `src/components/AuthProvider.tsx`
- Modify: `src/app/providers.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- `AuthProvider({ children }: { children: ReactNode })`
- `AuthForm({ mode, nextPath }: AuthFormProps)`

- [ ] Add accessible forms with labels, keyboard focus, loading states, and inline errors.
- [ ] Implement sign-up, sign-in, sign-out, and password-reset requests through Supabase Auth.
- [ ] Keep error copy generic enough not to reveal account existence.
- [ ] Preserve only safe internal `next` paths.
- [ ] Show a clear configuration message when Supabase variables are missing.
- [ ] Add tests for safe form states and auth route copy where practical.
- [ ] Run lint, typecheck, and the full test suite.
- [ ] Commit as `feat: add account screens`.

### Task 4: Connect the shared header and page access state

**Files:**
- Modify: `src/components/SiteHeader.tsx`
- Modify: `src/app/layout.tsx`
- Create: `src/components/SignOutButton.tsx`

- [ ] Show a signed-out `Sign in` link and a signed-in account indicator with `Sign out`.
- [ ] Keep navigation labels and existing visual hierarchy intact.
- [ ] Make sign-out call Supabase, clear the session, and navigate to `/about`.
- [ ] Ensure the header does not render user email or other unnecessary personal information.
- [ ] Test navigation, sign-out, and refresh behavior manually in a configured local environment.
- [ ] Commit as `feat: expose account state`.

### Task 5: Verify deployment readiness and create the PR

**Files:**
- Modify: `README.md`
- Modify: `.env.example`

- [ ] Document Supabase project setup, redirect URLs for localhost and `https://sepsis-watch.vercel.app`, and Vercel Preview/Production variables.
- [ ] Run `npm test`, `npm run lint`, `npx tsc --noEmit --incremental false`, and `npm run build`.
- [ ] Manually verify: create account, sign in, access a protected page, refresh, sign out, follow a deep link, and request a password reset.
- [ ] Review the diff for secrets and accidental changes to patient/research data.
- [ ] Push the feature branch and open a draft PR targeting `main`.
- [ ] Do not deploy to production until Supabase redirect URLs and Vercel variables are configured and the PR checks pass.
