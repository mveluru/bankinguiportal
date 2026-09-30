# Library (`lib/`)

Rule of thumb for the suffixes: files marked **client-safe** have no `node:` imports and can be imported from
components. Everything else is **server-only** (uses `node:fs` / `node:crypto`) and must be imported only from route
handlers, `proxy.ts`, or server components.

### Shared / client-safe

| File | Responsibility |
|---|---|
| `types.ts` | TypeScript mirrors of the Spring BFF DTOs (accounts, locations, requests, responses). |
| `api.ts` | Browser client for the banking backend: `getHome`, `getOverview`, `openAccount`, `withdraw`, `deposit`, `getStatement`, `closeAccount`. Adds `X-Customer-Id`, defines `ApiError`, and normalises the backend's two error shapes (plain text vs Spring JSON). |
| `format.ts` | `formatMoney`, `accountLabel`, `titleCase`. |
| `duration.ts` | Turns configured seconds/minutes into words ("8 hours") and parses positive numbers from env strings. |
| `device.ts` | "Chrome on macOS" from a user-agent string. |
| `navigation.ts` | `hardNavigate`: full page load for auth transitions, avoiding stale prefetched redirects. |
| `audit-events.ts` | Names, labels and severity of audit events; which count as failed/suspicious. Shared by the log writer and the activity page. |
| `preferences-shared.ts` | Preference types and defaults. |

### Session and authentication (server)

| File | Responsibility |
|---|---|
| `session.ts` | HMAC-signed session cookie via Web Crypto, so it runs in both route handlers **and** `proxy.ts`. Session length, remember-me, cookie attributes, `verifySessionToken` (also checks disabled/revoked state). |
| `users.ts` | Demo user store: parses `DEMO_USERS`, holds scrypt-hashed changed passwords (`.data/users.json`), `roleOf`. |
| `accounts.ts` | Admin-controlled `disabled` / `revokedBefore` per user (`.data/accounts.json`); this is how stateless sessions get cut off. |
| `lockout.ts` | Failed-password lockout by attempted username (`.data/lockouts.json`). |
| `resets.ts` | Single-use, short-lived password reset tokens, stored only as SHA-256 hashes. |
| `totp.ts` | RFC 6238 TOTP generation and verification with replay protection. |
| `twofactor.ts` | Per-user 2FA state: encrypted secrets (AES-256-GCM), hashed recovery codes, setup/enable/verify/disable. |
| `admin.ts` | `requireAdmin` guard for admin routes. |

### Per-user data and observability (server)

| File | Responsibility |
|---|---|
| `profiles.ts` | Editable display name and email (`.data/profiles.json`). |
| `preferences.ts` | Per-user settings: activity window, optional notification categories (`.data/preferences.json`). |
| `audit.ts` | Append-only JSON-lines audit log with rotation and client IP/user-agent capture. Never logs secrets. |
| `notifications.ts` | Curated notifications derived from the audit log; only a "read up to" marker is stored. |

### Content (server)

| File | Responsibility |
|---|---|
| `faq.ts` | Help & FAQ content; quotes live config so answers cannot drift from behaviour. |
| `legal.ts` | Terms of Use and Privacy Policy text, with operator details and durations read from config. |
