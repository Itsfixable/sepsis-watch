# Supabase account access design

## Intent

Require visitors to create an account and sign in before using SepsisWatch's interactive Monitor, Timelines, and Research experiences. Keep the public Overview page available so judges can understand the project before creating an account.

## Goals

- Provide real email/password accounts through Supabase Auth.
- Keep authentication state across page navigation and refreshes.
- Redirect unauthenticated visitors to a clear sign-in page.
- Provide sign-up, sign-in, sign-out, and password-reset flows.
- Keep patient records and research outputs unchanged; authentication controls access but does not turn the prototype into a clinical system.
- Avoid exposing Supabase service-role credentials to the browser.

## Non-goals

- Collecting or storing real patient information.
- Adding clinician roles, organization accounts, or administrative dashboards.
- Making the prototype clinically deployable.
- Moving the bundled simulated records or exported research results into Supabase.

## Security boundaries

- The browser may receive only the Supabase publishable/anonymous key.
- The Supabase service-role key, if needed for server operations later, must remain server-side and is not part of this change.
- Route protection must be enforced in application code, not only by hiding navigation links.
- Authentication errors must not reveal whether an email address belongs to an existing account.
- The app will clearly state that an account provides access to a research prototype and does not grant access to clinical data.

## Approaches considered

1. Supabase email/password authentication (selected): real accounts, managed sessions, password recovery, and no password storage in this repository. Requires a Supabase project and environment variables.
2. Google OAuth: less password handling, but it excludes users without Google accounts and adds OAuth consent/setup complexity.
3. Shared passcode: quick but not a real account system, provides no individual sessions, and does not meet the requested security goal.

Supabase email/password is selected because it gives the project a genuine account boundary while preserving broad access for judges.

## User experience

- `/about` remains public.
- `/login` contains sign-in and a link to account creation.
- `/signup` creates an account and explains that the site is a student research prototype.
- `/forgot-password` requests a reset email without confirming whether an address is registered.
- `/monitor`, `/replay`, `/research`, and `/prototype` require an authenticated session.
- Signed-in users see their account state and a sign-out action in the shared header.
- Unauthenticated deep links redirect to `/login` with a return path, so users can continue to the page they originally requested after signing in.

## Implementation outline

- Add the official Supabase browser and server helpers compatible with the repository's Next.js version.
- Add a client-side auth provider that listens for session changes and refreshes the UI.
- Add server-side route protection for restricted pages, using the current Supabase session rather than a client-only boolean.
- Add the auth pages and accessible form states for loading, invalid credentials, confirmation, and reset completion.
- Add environment-variable documentation for the Supabase URL and publishable key; do not commit secrets.
- Add tests for protected-route decisions and auth-related UI states where the current test setup supports them.

## Deployment requirements

The Vercel project must receive the Supabase project URL and publishable key for Preview and Production environments. Supabase Auth must allow the local development URL and the production SepsisWatch URL as redirect URLs. The change is incomplete until a fresh account can sign up, confirm or sign in, access a protected page, sign out, and be redirected back to login.

## Open implementation decisions

- Use the current public Vercel domain as the production redirect URL.
- Keep email confirmation enabled if the Supabase project supports it; if confirmation is unavailable during judging, show a clear sign-in error rather than silently creating an unusable account.
- Do not gate `/about`, because judges need to see the project purpose before deciding whether to register.
