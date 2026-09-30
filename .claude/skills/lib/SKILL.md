---
name: lib
description: Rules for lib/: client-safe vs server-only files, file-backed stores, session, lockout, 2FA, audit, notifications. Use when adding or editing anything in lib/.
---

# Library (`lib/`)

**Job:** everything non-visual. Two kinds of file, and the difference matters.

**Client-safe** (no `node:` imports; safe to import from components): `types.ts`, `api.ts`, `format.ts`,
`duration.ts`, `device.ts`, `navigation.ts`, `audit-events.ts`, `preferences-shared.ts`.

**Server-only** (`node:fs` / `node:crypto`; import only from route handlers, `proxy.ts`, server components):
`accounts.ts`, `admin.ts`, `audit.ts`, `lockout.ts`, `notifications.ts`, `preferences.ts`, `profiles.ts`,
`resets.ts`, `twofactor.ts`, `users.ts`, plus `faq.ts` and `legal.ts` (read env at render time).
Exceptions: `session.ts` and `totp.ts` use Web Crypto and run in both route handlers and `proxy.ts`.

Rules:
- Never import a server-only file from a `"use client"` component. If a client needs a type or constant from one, put
  it in a client-safe file, the way `audit-events.ts` and `preferences-shared.ts` do.
- File-backed stores write to `.data/*.json` with mode `0o600`, via a temp file and `renameSync`, and treat a missing
  or malformed file as empty.
- `lib/types.ts` mirrors the Spring BFF DTOs. Change it only when the backend DTO changes.
- `lib/api.ts` is the only place the browser talks to the banking backend. Add new calls there, and note whether they
  go through the BFF or the `/api/banking` proxy.
- Irreversible or side-effecting calls (`closeAccount`, `getStatement`, which emails/SMSes) must only run on an
  explicit user action.

### Per-file rules

| File | Rules |
|---|---|
| `session.ts` | HMAC-signed cookie. `verifySessionToken` also rejects disabled accounts and sessions issued before `revokedBefore`. Keep it Web Crypto only. |
| `users.ts` | `DEMO_USERS` is `username:password:customerId[:admin]`. Usernames match exactly, case-sensitively. Role is read from configuration on every call, never from a token. Passwords stored as scrypt hashes, compared with `safeEqual`. |
| `accounts.ts` | Admin `disabled` / `revokedBefore` state. This is how a stateless session gets cut off. |
| `lockout.ts` | Counts attempts by attempted username, existing or not. A locked name is refused even with the right password. |
| `resets.ts` | Tokens are random, single-use, short-lived, stored only as SHA-256 hashes. |
| `totp.ts`, `twofactor.ts` | RFC 6238. Reject codes at or before the last accepted step (replay). Secrets AES-256-GCM encrypted with a key derived from `AUTH_SECRET`; recovery codes hashed. Changing `AUTH_SECRET` disables existing 2FA. |
| `audit.ts`, `audit-events.ts` | Append-only JSON lines, rotated at `AUDIT_MAX_BYTES`. New events need a label and level in `audit-events.ts`. Never log secrets. IP headers are only trustworthy behind a proxy you control. |
| `notifications.ts` | A curated view over the audit log; the only stored state is a per-user "read up to" time. Security-critical events cannot be muted. |
| `preferences.ts`, `preferences-shared.ts` | Validate strictly on save; malformed stored values fall back to defaults. |
| `profiles.ts` | Editable display name and email only. |
| `admin.ts` | `requireAdmin` returns the admin's username or the 401/403 response to send. |
| `faq.ts`, `legal.ts` | User-facing text quoting live config. Update `LAST_UPDATED` in `legal.ts` on any wording change. |
| `format.ts`, `duration.ts`, `device.ts`, `navigation.ts` | Small pure helpers; keep them dependency-free and client-safe. |
