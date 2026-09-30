# Brite Banking UI Portal

Next.js (App Router, React 19, TypeScript) front end for the banking module of
[springbootexampleprojects](https://github.com/mveluru/springbootexampleprojects). It talks only to the
backend's BFF endpoints (`/bff/v1/portal/*`), one call per screen.

| Screen | Route | BFF call |
|---|---|---|
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
- `X-Customer-Id` is only a rate-limit key; there is no login yet.
- A 429 from the backend has no CORS headers, so the browser reports it as a network error; the UI words its error message accordingly.
- Next ideas: BFF passthroughs for withdraw/deposit (would remove the proxy), statements, login.
