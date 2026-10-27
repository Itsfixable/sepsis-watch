# Guest access

Approved in chat: provide access without creating a Supabase account. Monitor,
Timelines (including classic), Research and Prototype expose only existing
bundled sample/research records. Make these routes public, and add a clearly
visible Continue as guest link to login and signup, even without auth configuration.
Preserve a safe workspace deep link; password-management destinations fall back
to Timelines. Keep confirmed-account checks on password updates, email verification,
safe redirects and the disabled production readings API unchanged.

Approaches: public workspace access is selected because these records are already
public and it avoids email limits. Anonymous Supabase accounts would add provider
dependency and unnecessary stored accounts. A guest cookie would provide no
security benefit for this public content. No new cookies or personal-data stores.

No deployment or merge is requested: create a PR with test evidence. Account
email delivery and existing dependency findings remain separate limitations.
