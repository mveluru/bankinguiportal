---
name: api-routes
description: Rules for route handlers under app/api (auth, admin, 2FA, audit, lockout, status codes). Use when adding or editing an API route.
---

# API routes (`app/api/**/route.ts`)

**Job:** thin controllers for the demo identity layer (`auth/*`, `admin/*`). Parse, validate, call a `lib/` module,
audit, respond.

Rules:
- Verify the session inside the handler (`verifySessionToken` on the `SESSION_COOKIE`). `proxy.ts` is a gate, not the
  only check.
- Admin routes call `requireAdmin(request)` first. It is the real access control; hiding the nav link is not.
- Return JSON `{ message }` with the right status: 401 signed out, 403 forbidden, 429 locked (with `Retry-After`).
- Audit every security-relevant outcome, success and failure, with `audit(request, event, username, detail?)`.
  Register new event names in `lib/audit-events.ts`.
- Failed password attempts go through `lib/lockout.ts`; unknown usernames count too, and responses must not reveal
  whether a username exists.
- Node-only modules (`node:fs`, `node:crypto`) are fine here, not in client code.
- Never return password hashes, 2FA secrets or recovery codes.
