# Key flows

**Sign-in.** `login` page → `POST /api/auth/login` → lockout check → password check → if 2FA is on, set a 5-minute
signed *pending* cookie and go to `/login/verify`; otherwise issue the session cookie. Every step is audited.

**Every request.** `proxy.ts` verifies the session cookie. Public pages and auth endpoints pass; everything else
redirects to `/login` (pages) or returns 401 (`/api/*`). `verifySessionToken` also rejects sessions for disabled or
revoked accounts, so an admin action takes effect on the user's next request.

**Money operations.** Page → `lib/api.ts` → Spring BFF (or `/api/banking/*` rewrite). The Spring service is not
authenticated; the customer ID header is only a rate-limit key.

**Notifications.** No per-notification storage: `lib/notifications.ts` filters `audit.log` into plain-language items
for the user, and the badge counts entries newer than the stored "read up to" timestamp.
