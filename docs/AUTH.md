# Account access

Overview (`/about`) remains public. Monitor, Timelines (including the classic
view), Research, Prototype, and the password-update page require a confirmed
Supabase email account. Both Next.js Proxy and each protected server page verify
the user with Supabase. Missing configuration or failed verification denies access.

## Connect Supabase before merging

1. Create or select a Supabase project. Enable email/password authentication
   and **Confirm email**. Disable anonymous sign-ins.
2. Set the minimum password length to 12 in Supabase. The UI also requires 12
   characters for new passwords; the provider setting enforces it at the API.
3. Copy `.env.example` to `.env.local` and fill in the project URL and
   **publishable** key. Never use a service-role or secret key.
4. Add the same two variable names to Vercel Preview and Production:
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   The values are public client configuration. Redeploy after changes because
   Next.js embeds public environment values during the build.
5. Set the Supabase Site URL to `https://sepsis-watch.vercel.app`.
   Allow these redirect URL patterns:
   - `https://sepsis-watch.vercel.app/auth/callback**`
   - `http://localhost:3000/auth/callback**`
   - The exact Vercel preview origin followed by `/auth/callback**`.
   Add the actual local port if it differs. Restrict production patterns to your
   own domains. The suffix accommodates the internal `next` query parameter.
6. Use Supabase's default `{{ .ConfirmationURL }}` link in confirmation and
   recovery email templates. The SDK uses PKCE: the visitor must open the link
   in the browser that requested it. The callback exchanges the code for a
   session, then sends recovery requests to `/update-password`.
7. Configure custom SMTP for public registration. The default Supabase mail
   service has recipient restrictions and low sending limits. Verify delivery
   to an address outside the project team before directing judges to signup.
   Retain provider rate limits; review CAPTCHA settings before broad promotion.

## What is collected

Supabase handles the account email, password hash, authentication events and
session information. The project owner can administer accounts in Supabase.
Passwords are sent over HTTPS directly to Supabase; they are not logged or stored
by SepsisWatch. The browser uses Supabase session cookies, accessible to its SDK.
No patient records are uploaded or attached to accounts. Signing out removes
the current browser session; it does not delete the account or sign out other devices.
Account deletion is available to the project owner through the Supabase dashboard.

The login wall controls the interactive workspace, not distribution of the
sample data. Overview, the public repository, and bundled demo assets remain
public. Do not use this implementation to store sensitive patient information.
No database tables or row-level security policies are added in this PR.

The local readings API retains its separate development-only restriction. It is
disabled on Vercel and in production, including for signed-in users. If it is ever
enabled remotely, it needs its own authorization and per-user storage.

## Required preview checks

These checks require a real configured Supabase project and mailbox; unit tests
with mocked provider responses do not establish that email delivery works.

- Register a new address; protected pages remain blocked until confirmation.
- Open the confirmation email in the same browser; verify access to all four
  workspace pages and `/replay/classic`.
- Refresh a protected page; the session persists.
- Use a protected deep link while signed out; login returns to that page.
- Try an invalid password; the message does not identify account existence.
- Sign out, use Back, and reopen a protected URL; access requires sign-in.
- Request a password reset, follow the link, set a new password, then sign in
  with it. Test an expired or reused email link and a recovery request for an
  unknown address.
- Check the signup and login screens on a narrow phone viewport and with a keyboard.

Without configuration, protected URLs redirect to login and login explains that
account access is being configured. This state is intentional, but it means the
PR must remain a draft until setup and the checks above are completed.

References: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[password authentication](https://supabase.com/docs/guides/auth/passwords),
[SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
