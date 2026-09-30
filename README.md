# Brite Banking UI Portal

Next.js (App Router, React 19, TypeScript) front end for the banking module of
[bankingservices](https://github.com/mveluru/bankingservices). It talks only to the
backend's BFF endpoints (`/bff/v1/portal/*`), one call per screen.

| Screen | Route | BFF call |
|---|---|---|
| Sign in (demo) | `/login` | `POST /api/auth/login` (Next route handler, not the backend) |
| Terms of Use and Privacy Policy (public; linked from the footer on every page) | `/terms`, `/privacy` | none (server components) |
| Help & FAQ (public, searchable, deep-linkable e.g. `/help#locked-out`) | `/help` | none (server component; `SUPPORT_EMAIL` optional) |
| Settings hub: appearance (system/light/dark), default activity window, notification categories, links to profile/password/2FA/activity | `/settings` | `GET/PUT /api/auth/preferences` (Next route handlers) |
| Profile (demo: username, customer ID, editable display name + email) | `/settings/profile` | `GET/PUT /api/auth/profile` (Next route handlers) |
| Two-factor authentication (TOTP): setup + QR, recovery codes, turn off | `/settings/two-factor` | `/api/auth/2fa/{status,setup,enable,disable}` (Next route handlers) |
| Sign-in code step | `/login/verify` | `POST /api/auth/2fa/verify` |
| Notifications (plain-language security/account updates, unread badge in the nav) | `/notifications` | `GET/POST /api/auth/notifications` (Next route handlers) |
| Sign-in activity (audit log of your own events) | `/settings/activity` | `GET /api/auth/activity` (Next route handler) |
| Admin: user management (admins only): list, unlock, reset 2FA, disable/enable | `/admin/users` | `GET /api/admin/users`, `POST /api/admin/users/{username}` (Next route handlers) |
| Change password (demo) | `/settings/password` | `POST /api/auth/password` (Next route handler) |
| Forgot / reset password (demo) | `/forgot-password`, `/reset-password?token=` | `POST /api/auth/forgot`, `POST /api/auth/reset` (Next route handlers) |
| Home (accounts + branches/ATMs, state filter) | `/` | `GET /home?state=` |
| Account overview (balance + activity) | `/accounts/[accountNumber]` | `GET /accounts/{n}/overview?days=` |
| Open account | `/accounts/open` | `POST /accounts/open` |
| Deposit | `/accounts/[accountNumber]/deposit` | `POST /bff/v1/portal/accounts/deposit` |
| Statement (date range; backend also emails/SMSes it) | `/accounts/[accountNumber]/statement` | `POST /bff/v1/portal/accounts/{n}/statement?beginDate=&endDate=` |
| Suspend / manage suspension / reactivate | `/accounts/[accountNumber]/suspend` | `POST .../suspend`, `PATCH .../suspension`, `POST .../reactivate` (BFF) |
| Close account (typed confirmation, irreversible) | `/accounts/[accountNumber]/close` | `POST /bff/v1/portal/accounts/{n}/close` |
| Withdraw | `/accounts/[accountNumber]/withdraw` | `POST /bff/v1/portal/accounts/withdraw` |

## Run

1. Start the backend (port 8081, context path `/brite`). It already allows `http://localhost:3000` via `banking.portal.allowed-origins`.
2. `cp .env.local.brite .env.local` (defaults are fine locally)
3. `npm install && npm run dev` → http://localhost:3000

### Stop and start the server

Start (development, http://localhost:3000):

```bash
npm run dev
```

Stop: press `Ctrl+C` in the terminal where it is running. If it was started in the background or another
terminal, find and stop it by port:

```bash
lsof -i :3000          # shows the PID of whatever is listening on 3000
kill <PID>             # or in one step: lsof -ti :3000 | xargs kill
```

Restart: stop it as above, then run `npm run dev` again. Changes to `.env.local` are only read at startup, so
restart after editing it. Code changes hot-reload without a restart.

Production build instead of dev mode:

```bash
npm run build && npm start   # serves on http://localhost:3000; stop it the same way
```

The backend (port 8081) is a separate process; stopping the portal does not stop it.

### End-to-end tests

`npm run test:e2e` logs in and checks the home and account screens in Chrome. It needs the backend running and
Google Chrome installed. It reuses a dev server already on port 3000, or starts one. The specs are read-only
(no deposit, withdraw, suspend, close or statement). Override the defaults with `E2E_USER`, `E2E_PASSWORD`,
`E2E_ACCOUNT` and `E2E_PORT`.

## Deploy

`node_modules/` and `.next/` are not in git (gitignored). The repo holds `package.json` (what to install) and
`package-lock.json` (the exact versions and hashes), so every machine downloads the packages itself from the npm
registry and builds the app.

Requirements: Node.js 20.9 or newer (Next 16's minimum) and network access to the npm registry (or a mirror) during
install.

```bash
git clone <repo> && cd bankinguiportal
npm ci               # installs exactly what package-lock.json says (use this, not `npm install`, on servers/CI)
# set the environment (see below), then:
npm run build        # compiles the app into .next/
npm start            # serves on http://localhost:3000 (run with PORT=... to change it)
```

How the app finds its packages: Node resolves imports such as `react` and `next` from `./node_modules`, both at build
time and at runtime, so a production host needs `node_modules/` (at least the runtime dependencies) and `.next/`
side by side. The browser never sees `node_modules`: Next bundles the client code into `.next/static`.

Build once and ship, instead of building on the server:
1. CI runs `npm ci && npm run build`.
2. Deploy `.next/`, `public/`, `package.json`, `package-lock.json` and `next.config.ts`, then run
   `npm ci --omit=dev` on the target (skips dev tools such as TypeScript and ESLint) and `npm start`.
   In a Docker image, do the same in a multi-stage build so the final image has no dev dependencies.

`output: "standalone"` in `next.config.ts` is a smaller alternative (Next copies only the files the server needs,
including a trimmed `node_modules`). It is not enabled today, and `public/` and `.next/static` must then be copied
next to the standalone server.

Step-by-step packaging and deployment (release tarball, systemd, nginx, Docker, rollback):
[`.claude/docs/production_deploy.md`](.claude/docs/production_deploy.md).

### Production checklist

- **Environment variables** are not in git (`.env.local` is gitignored), so set them on the host. Required in
  production: `AUTH_SECRET` (a long random string; changing it later disables existing 2FA setups). Also set
  `DEMO_USERS` (the default demo passwords are public), `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_BFF_PORTAL_PATH` (BFF path prefix, default `/bff/v1/portal`, build time), `BANKING_BACKEND_URL` and any of
  the optional ones in `.env.local.brite`.
- **Build-time vs start-time:** `NEXT_PUBLIC_*` values are baked into the browser bundle during `npm run build`, so set
  them *before* building. `BANKING_BACKEND_URL` and the other server variables are read when the server starts.
- **Persistent `.data/`:** users, 2FA, lockouts, preferences and the audit log live in `.data/` under the working
  directory. Mount a persistent, writable volume there, or a redeploy or container restart loses them.
- **Banking backend:** it must be reachable from the browser (for `NEXT_PUBLIC_API_BASE_URL`, with this site's origin
  in its `banking.portal.allowed-origins`) and from the Next server (for `BANKING_BACKEND_URL`). It does not
  authenticate requests, so restrict network access to it.
- **HTTPS:** serve behind a TLS-terminating proxy; the session cookie is marked Secure in production. Client IPs in the
  audit log come from `X-Forwarded-For` / `X-Real-IP`, which are only trustworthy behind a proxy you control.
- **Login is a front-end-only demo**, not real security (see Notes below). It is not suitable for real customers as is.

## Docs

Architecture and per-layer reference live in [`.claude/docs/`](.claude/docs/index.md) (start with `overview.md`). Rules
for changing each layer are skills in [`.claude/skills/`](.claude/skills/), one `SKILL.md` per layer.

## Notes
- Withdraw and deposit use BFF endpoints (they return the refreshed overview). Statement and close do too, so every banking call goes to `/bff/**`; the `/api/banking/*` rewrite in `next.config.ts` (and `BANKING_BACKEND_URL`) is no longer used by any screen. The backend validates the holder's name and address but doesn't use them, so the forms collect them (names are prefilled).
- **Login is a front-end-only demo, not real security.** Users come from `DEMO_USERS` (`username:password:customerId,...`, default `demo` / `demo1234`); the session is an HMAC-signed httpOnly cookie (`AUTH_SECRET`, required in production). `proxy.ts` redirects signed-out visitors to `/login` and returns 401 for `/api/banking/*`. Sessions last `SESSION_MAX_AGE_SECONDS` (default 8h); `NEXT_PUBLIC_SESSION_WARNING_SECONDS` (default 120) before expiry a countdown dialog offers "Stay signed in" (re-issues the cookie via `/api/auth/refresh`) and the user is signed out automatically at expiry. Security events (sign-in success/failure/blocked, lockouts, 2FA steps, sign-out, timeout, password and 2FA changes) are appended as JSON lines to `.data/audit.log` (gitignored, rotated to `audit.log.1` past `AUDIT_MAX_BYTES`, default 1 MB); no passwords, codes or tokens are ever logged. Each user sees only their own events on the activity screen, which flags failed attempts since their previous sign-in. IP comes from `X-Forwarded-For`/`X-Real-IP` when present and is only trustworthy behind a proxy you control. Users can be admins via a fourth `DEMO_USERS` field (`username:password:customerId:admin`). `/api/admin/*` is the real access control (401 signed out, 403 for non-admins, role read from configuration on every request, refusals audited); the UserMgnt nav link is convenience. Admins can unlock a user, reset their 2FA and disable/enable them (not themselves). Disabling signs the user out everywhere immediately: sessions carry an issued-at time and `verifySessionToken` rejects any session for a disabled account or issued before its `revokedBefore` marker (state in `.data/accounts.json`); an open tab notices on its next request. Every action is audited on both the admin's and the affected user's history. The user list never includes passwords, hashes or secrets; each view is recorded in the audit log. The cookie banner (`components/CookieNotice.tsx`) is deliberately a *notice*, not a consent prompt: the portal sets only strictly necessary cookies plus the theme you pick, which don't need consent, and "Accept/Reject" for cookies that don't exist would be misleading. It's dismissible, remembered in localStorage (`cookie_notice_ack`, versioned so a bump re-shows it) and never server-rendered, so returning visitors get no flash. If you ever add analytics or marketing cookies, replace it with real per-category consent and don't set them until the visitor opts in. Terms (`/terms`) and Privacy (`/privacy`) are public server components in `lib/legal.ts`: the Privacy Policy describes what the portal actually stores, sets and shows (audit log, cookies, admin visibility) and quotes live config for durations; the Terms are a standard template. Both show a visible "template" notice until `LEGAL_REVIEWED=true`; entity name, contact (`SUPPORT_EMAIL`) and an optional governing-law clause come from env. Update `LAST_UPDATED` whenever the wording changes and get the text reviewed by a lawyer before relying on it. Help & FAQ (`/help`) is public so people who can't sign in can reach it. It renders per request and reads the same env vars as the app (lockout, session and remember-me lengths, ...), so its answers can't drift from the behaviour; bank rules that live in the banking service (cash limit, minimum balances, statement range) are quoted as its defaults. Settings (`/settings`) stores per-user preferences in `.data/preferences.json`: a default activity window (7/30/60/90 days, used by the account overview and as the statement's default start date) and which optional notification categories to show. Security-critical notifications can't be muted. The theme choice (System/Light/Dark) is per device, in localStorage. Notifications are a curated view over the same audit log (new-device sign-ins, failed attempts before you signed in, lockouts, password/2FA changes, admin actions on your account), so nothing is stored per notification; each user's only state is a "read up to" timestamp in `.data/notifications.json`. Failed passwords lock a username after `LOCKOUT_MAX_ATTEMPTS` (5) failures for `LOCKOUT_MINUTES` (15): sign-in, change-password and turn-off-2FA share the counter, unknown usernames are counted too (so a lock doesn't reveal which accounts exist), a locked name is refused even with the right password (HTTP 429 + `Retry-After`), and a successful sign-in or password reset clears it. Anyone can lock a known username on purpose; the reset link is the escape hatch. State is in `.data/lockouts.json`. Two-factor auth is standard TOTP (RFC 6238; any authenticator app). With it on, a correct password only sets a 5-minute signed *pending* cookie, and the session is issued after `/login/verify` accepts a code or a one-time recovery code. Codes can't be replayed, 5 failures lock the account's 2FA for 5 minutes, secrets are AES-256-GCM encrypted with a key derived from `AUTH_SECRET` (so changing it disables existing 2FA setups), and state lives in `.data/twofactor.json`. Turning it off needs the password plus a code. "Remember me" on the sign-in form issues a persistent cookie lasting `REMEMBER_ME_MAX_AGE_SECONDS` (default 30 days); without it the cookie is dropped when the browser closes and the normal session length applies. The choice is kept across "Stay signed in". Sessions are stateless, so they can't be revoked server-side. Profile edits are saved in `.data/profiles.json`. Changed passwords are saved as scrypt hashes in `.data/users.json` (gitignored) and override `DEMO_USERS`; delete that file to reset. Forgot password has no email service: the reset link is printed to the `next dev` console (single-use, 30 min, hashed in `.data/resets.json`), and the response never reveals whether a username exists. Existing sessions stay valid after a change (stateless cookie). The logged-in user's `customerId` is sent as `X-Customer-Id`, but the backend still doesn't authenticate anything, and its BFF endpoints are reachable directly. Real auth needs to be added to the Spring service (see the backend's BFF "Auth (not built yet)" note).
- `X-Customer-Id` is only a rate-limit key.
- A 429 from the backend has no CORS headers, so the browser reports it as a network error; the UI words its error message accordingly.
- Next ideas: remove the unused `/api/banking` proxy config, login.
