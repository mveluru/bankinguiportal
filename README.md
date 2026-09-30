# Brite Banking UI Portal

Next.js (App Router, React 19, TypeScript) front end for the banking module of
[springbootexampleprojects](https://github.com/mveluru/springbootexampleprojects). It talks only to the
backend's BFF endpoints (`/bff/v1/portal/*`), one call per screen.

| Screen | Route | BFF call |
|---|---|---|
| Sign in (demo) | `/login` | `POST /api/auth/login` (Next route handler, not the backend) |
| Profile (demo: username, customer ID, editable display name + email) | `/settings/profile` | `GET/PUT /api/auth/profile` (Next route handlers) |
| Change password (demo) | `/settings/password` | `POST /api/auth/password` (Next route handler) |
| Forgot / reset password (demo) | `/forgot-password`, `/reset-password?token=` | `POST /api/auth/forgot`, `POST /api/auth/reset` (Next route handlers) |
| Home (accounts + branches/ATMs, state filter) | `/` | `GET /home?state=` |
| Account overview (balance + activity) | `/accounts/[accountNumber]` | `GET /accounts/{n}/overview?days=` |
| Open account | `/accounts/open` | `POST /accounts/open` |
| Deposit | `/accounts/[accountNumber]/deposit` | `POST /v1/api/accounts/deposit` (via proxy) |
| Statement (date range; backend also emails/SMSes it) | `/accounts/[accountNumber]/statement` | `GET /v1/api/accounts/{n}/statement` (via proxy) |
| Close account (typed confirmation, irreversible) | `/accounts/[accountNumber]/close` | `POST /v1/api/accounts/{n}/close` (via proxy) |
| Withdraw | `/accounts/[accountNumber]/withdraw` | `POST /v1/api/accounts/withdraw` (via proxy) |

## Run

1. Start the backend (port 8081, context path `/brite`). It already allows `http://localhost:3000` via `banking.portal.allowed-origins`.
2. `cp .env.local.example .env.local` (defaults are fine locally)
3. `npm install && npm run dev` → http://localhost:3000

## Notes
- Withdraw/deposit are not BFF endpoints and the backend only enables CORS on `/bff/**`, so `next.config.ts` proxies `/api/banking/*` to `BANKING_BACKEND_URL`. The backend validates the holder's name and address but doesn't use them, so the forms collect them (names are prefilled).
- **Login is a front-end-only demo, not real security.** Users come from `DEMO_USERS` (`username:password:customerId,...`, default `demo` / `demo1234`); the session is an HMAC-signed httpOnly cookie (`AUTH_SECRET`, required in production). `proxy.ts` redirects signed-out visitors to `/login` and returns 401 for `/api/banking/*`. Sessions last `SESSION_MAX_AGE_SECONDS` (default 8h); `NEXT_PUBLIC_SESSION_WARNING_SECONDS` (default 120) before expiry a countdown dialog offers "Stay signed in" (re-issues the cookie via `/api/auth/refresh`) and the user is signed out automatically at expiry. Profile edits are saved in `.data/profiles.json`. Changed passwords are saved as scrypt hashes in `.data/users.json` (gitignored) and override `DEMO_USERS`; delete that file to reset. Forgot password has no email service: the reset link is printed to the `next dev` console (single-use, 30 min, hashed in `.data/resets.json`), and the response never reveals whether a username exists. Existing sessions stay valid after a change (stateless cookie). The logged-in user's `customerId` is sent as `X-Customer-Id`, but the backend still doesn't authenticate anything, and its BFF endpoints are reachable directly. Real auth needs to be added to the Spring service (see the backend's BFF "Auth (not built yet)" note).
- `X-Customer-Id` is only a rate-limit key.
- A 429 from the backend has no CORS headers, so the browser reports it as a network error; the UI words its error message accordingly.
- Next ideas: BFF passthroughs for withdraw/deposit (would remove the proxy), statements, login.
