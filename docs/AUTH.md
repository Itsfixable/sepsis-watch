# Account access

Overview (`/about`), Monitor, Timelines (including the classic view), Research and
Prototype are public sample-data pages. Login and signup offer **Continue as
guest**, preserving a safe workspace destination without creating a Supabase
account, sending email or setting a guest cookie. Direct workspace links work too.

Accounts are optional. The password-update page still requires a confirmed
Supabase email account, verified by both Next.js Proxy and the server page.
Missing configuration or failed verification denies account-management access,
but does not prevent browsing the sample-data workspace.

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

## Refresh production configuration

`NEXT_PUBLIC_SUPABASE_URL` must be the project origin, for example
`https://YOUR-PROJECT.supabase.co`, without `/rest/v1/` or a dashboard path.
Use the publishable key from that same project and select the Production
environment in Vercel. Do not paste quoted values or a secret/service-role key.

Saving environment variables does not update an existing deployment. Redeploy
Production or merge a new commit into the configured production branch to trigger
a fresh build through the Vercel Git integration. If the deployment is skipped,
check the project's build-ignore settings and deployment permissions.

After the deployment is Ready, open `/login` in a private browser window. It
should display the email and password form instead of the configuration notice.
Then test signup, email confirmation, sign-in and sign-out. A successful build
alone does not verify authentication or email delivery.

## What is collected

Supabase handles the account email, password hash, authentication events and
session information. The project owner can administer accounts in Supabase.
Passwords are sent over HTTPS directly to Supabase; they are not logged or stored
by SepsisWatch. The browser uses Supabase session cookies, accessible to its SDK.
No patient records are uploaded or attached to accounts. Signing out removes
the current browser session; it does not delete the account or sign out other devices.
Account deletion is available to the project owner through the Supabase dashboard.

Guests see the same bundled records as signed-in visitors; no private patient
data or account information is exposed by guest access. Hosting providers may
still process request metadata such as IP addresses. Guest access does not mean
anonymous network traffic. The public repository and bundled demo assets remain
public. Do not use this implementation to store sensitive patient information.
No database tables or row-level security policies are added in this PR.

The local readings API retains its separate development-only restriction. It is
disabled on Vercel and in production, including for signed-in users. If it is ever
enabled remotely, it needs its own authorization and per-user storage.

## Required preview checks

These checks require a real configured Supabase project and mailbox; unit tests
with mocked provider responses do not establish that email delivery works.

- From login and signup, choose Continue as guest without entering credentials.
- Open Monitor, Timelines, classic Timelines, Research and Prototype while signed
  out, including when Supabase is unconfigured. They remain accessible.
- Register a new address; password updates remain blocked until confirmation.
- Open the confirmation email in the same browser; verify access to all four
  workspace pages and `/replay/classic`.
- Refresh a protected page; the session persists.
- Use `/update-password` while signed out; login returns to that page. Choosing
  Continue as guest instead goes to `/replay`, never password management.
- Try an invalid password; the message does not identify account existence.
- Sign out, use Back, and reopen `/update-password`; access requires sign-in.
- Request a password reset, follow the link, set a new password, then sign in
  with it. Test an expired or reused email link and a recovery request for an
  unknown address.
- Check the signup and login screens on a narrow phone viewport and with a keyboard.

Without configuration, `/update-password` redirects to login and login explains
that account access is being configured. The guest link and sample pages remain
available. Verify hosted account flows separately before claiming they work;
guest access does not fix email delivery or remove provider rate limits.

References: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[password authentication](https://supabase.com/docs/guides/auth/passwords),
[SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
