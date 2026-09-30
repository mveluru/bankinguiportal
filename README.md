# Brite Banking UI Portal

Next.js (App Router, React 19, TypeScript) front end for the banking module of
[springbootexampleprojects](https://github.com/mveluru/springbootexampleprojects). It talks only to the
backend's BFF endpoints (`/bff/v1/portal/*`), one call per screen.

| Screen | Route | BFF call |
|---|---|---|
| Home (accounts + branches/ATMs, state filter) | `/` | `GET /home?state=` |
| Account overview (balance + activity) | `/accounts/[accountNumber]` | `GET /accounts/{n}/overview?days=` |
| Open account | `/accounts/open` | `POST /accounts/open` |

## Run

1. Start the backend (port 8081, context path `/brite`). It already allows `http://localhost:3000` via `banking.portal.allowed-origins`.
2. `cp .env.local.example .env.local` (defaults are fine locally)
3. `npm install && npm run dev` → http://localhost:3000

## Notes
- `X-Customer-Id` is only a rate-limit key; there is no login yet.
- A 429 from the backend has no CORS headers, so the browser reports it as a network error; the UI words its error message accordingly.
- Next ideas: withdraw/deposit (backend needs BFF passthroughs first), statements, login.
