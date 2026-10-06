# Design overview

How the Brite Banking UI Portal is laid out: what each folder is for, what every file in `lib/` and `components/`
does, and how a request moves through them.

**Start here first:**
- **Functional/technical requirements:** [`bankingui-requirements.md`](bankingui-requirements.md) (customer/staff features, technical stack, compliance)
- **Architecture & implementation:** This file (folder structure, request flow, conventions)
- **Screens and environment variables:** [`README.md`](../../README.md) (repo root) and `.env.local.brite`
- **Production deployment:** [`.claude/docs/production_deploy.md`](production_deploy.md) (deployment paths, security, monitoring, runbooks)
- **Testing:** [`testing.md`](testing.md) (e2e specs, test data, daily request limit considerations)

> This project uses a newer Next.js (16.x) than most docs describe. Before changing framework-level code, read the
> matching guide in `node_modules/next/dist/docs/`. Note that the request gate is `proxy.ts` (formerly `middleware.ts`).

## 1. Big picture

```
Browser ──► proxy.ts (portal gate: customer ⇄ / , staff ⇄ /staff) ──► app/ pages (React 19, App Router)
                                                                          │ fetch same-origin only
              ┌───────────────────────────┬───────────────────────────────┤
              ▼                           ▼                               ▼
   /api/auth/{login,logout,me}   /api/portal/[...path]           /api/staff/[...path]
   (sign in, cookies, profile)   (customer BFF proxy)            (staff BFF proxy)
              └───────────────┬───────────┴───────────────────────────────┘
                              ▼  lib/backend.ts: Authorization: Bearer <JWT from httpOnly cookie>, X-Customer-Id
                  Spring banking service  /bff/v1/portal/*   /bff/v1/staff/*
```

One backend owns everything: money, **identity** (customer and employee logins, JWTs, lockout, security questions,
login status) and authorisation (roles and privileges). The portal is a client of it with two parts:

- **Browser code** only calls this app's own `/api/*` route handlers through `lib/api.ts`.
- **Route handlers** hold the backend's JWT in an httpOnly cookie, add it as a Bearer header and forward to the BFF. They
  contain no business rules. Details: [backend-integration.md](backend-integration.md).

Nothing is stored on this server (no `.data/`, no audit log). Removed with this design: the demo `DEMO_USERS` login, TOTP
two-factor, profiles, preferences, notifications, the audit log and the local `/admin/users`.

### Key Architectural Principles

1. **Backend owns identity and money:** No local user database, no stored preferences, no transaction ledger. Portal is stateless.
2. **Token in httpOnly cookie:** Browser cannot access JWT (immune to XSS). Forwarded to backend by route handlers only.
3. **No CORS needed:** Backend stays internal (on banking.internal). Only Next.js server calls it, never the browser.
4. **Two portals, one backend:** Same backend serves customer (`/`) and staff (`/staff/*`) through separate JWTs and BFF paths.
5. **Roles enforced by backend:** UI hides unavailable actions, but backend enforces on every request (never trust the UI).
6. **No data persistence:** Release can be swapped without data migration. Horizontal scaling without state sharing.
7. **Daily request limit:** 1,000 per user/day (MySQL counter). One-time pop-up on exceed, never inline errors.

## 2. Folder map

| Path | Purpose |
|---|---|
| `app/` | Routes (App Router). Customer screens at `/`, `/accounts/*`, `/settings/*`; staff screens under `/staff/*`. |
| `app/api/` | Route handlers: `auth/{login,logout,me}` and the two catch-all BFF proxies `portal/[...path]`, `staff/[...path]`. |
| `components/` | Shared React components. The shell: `NavBar` (top bar: brand, `LoginCount`, `SignOutButton`, theme switch) and `SideNav` (the left panel of feature buttons). `components/auth/` (sign-in, forgot/change password, security questions, settings hub) and `components/accounts/` (account detail, close, suspend, reactivate, open, lookup box, statements) take a `kind` (`customer` or `staff`) where both portals share them. Staff admin: `CredentialAdmin`, `RateLimitPanel`. Pop-ups: `RateLimitNotice`, `SessionTimeout`. |
| `lib/` | Types, the browser API client, formatting, and the small server helpers that talk to the backend. |
| `proxy.ts` | Runs before every page request: routes customers and employees to their own portal, signed-out visitors to the right sign-in page. Not applied to `/api/*`. |
| `next.config.ts` | Empty config: no rewrites are needed any more. |
| `public/` | Static assets served as-is. |
| `.env.local.brite` | Template for `.env.local`. Every tunable is an env var. |
| `.claude/` | Claude Code project files, not part of the app: `CLAUDE.md` / `AGENTS.md`, `docs/` (these docs), `skills/` (rules per layer). |
| `e2e/` | Playwright specs against the real backend ([testing.md](testing.md)), including the phone-size audit `mobile.spec.ts`. |

## 3. Request Flow (How Data Moves)

```
1. Browser makes request
   → GET /accounts/CH-123 (on customer portal)

2. proxy.ts (request gate)
   → Routes to correct portal (customer / staff)
   → Checks token type & expiry (customer token vs staff token)
   → Allows request or redirects to sign-in

3. React component (e.g., AccountOverview.tsx)
   → Calls lib/api.ts getAccountOverview('CH-123')

4. lib/api.ts (client)
   → Makes fetch: GET /api/portal/accounts/CH-123/overview
   → Browser sends httpOnly bank_token cookie automatically

5. route handler (/api/portal/[...path]/route.ts)
   → Receives request + bank_token cookie
   → Extracts JWT from cookie
   → Calls backend: GET /bff/v1/portal/accounts/CH-123/overview
   → Adds header: Authorization: Bearer <JWT>
   → Adds header: X-Customer-Id: CH-123 (for rate limiting)
   → Receives response from backend

6. Backend (Spring, port 8081)
   → Validates JWT signature & expiry
   → Checks rate limit (daily request counter)
   → Checks permission (customer can only access own accounts)
   → Fetches data from MySQL
   → Returns { balance, activities, holderAddress, ... }

7. route handler
   → Passes response back to browser as JSON

8. React component
   → Parses JSON, renders account details on screen

9. Browser shows
   → Account balance, activity, holder address, action buttons
```

**Key points:**
- Token lives in httpOnly cookie (browser cannot read)
- Token sent to Next.js route handler (always to same origin)
- Route handler adds JWT to backend request (Bearer header)
- Backend validates token & enforces permissions
- No direct browser→backend calls (all through route handlers)
- Daily request limit enforced by backend (each fetch counts)

## 4. Error Handling

Errors flow back through the same path:

```
Backend error (e.g., 429 "rate limit exceeded")
  → route handler catches it
  → lib/api.ts recognizes 429
  → notifies listener (e.g., ErrorBoundary or state manager)
  → Component renders ErrorMessage with generic text
  → For 429: RateLimitNotice pops dialog (once per limit, not per request)
  → For 400–500: grey "not available right now" box
```

No backend URLs, token details, or internal errors shown to user.

## 5. Session & Cookie Management

Two httpOnly cookies:
1. **`bank_token`:** JWT from backend (lifetime = token expiry = 30 min)
2. **`bank_profile`:** Display data (name, role, branch, account ids) — used by proxy.ts & React

Profile is not trusted for permissions (backend re-checks on every call).

Theme choice persists in `localStorage` (not httpOnly; safe because theme is not sensitive).

## 6. Role-Based Access Control (RBAC)

| Role | Screens | API Paths |
|---|---|---|
| Customer | `/`, `/accounts/*`, `/settings/*` | `/api/portal/*` |
| Teller | `/staff`, `/staff/accounts/*` | `/api/staff/*` |
| Manager | Teller + suspend/reactivate + customer mgmt | `/api/staff/*` |
| Area Manager | Manager + open account + employee mgmt | `/api/staff/*` |

**Rule:** Backend enforces on every call. UI shows/hides buttons based on profile, but hidden button is not permission (network call would still be denied).

## 7. Conventions

- Import with the `@/` alias (`@/lib/session`, `@/components/NavBar`).
- Keep server-only modules (`backend.ts`, `bff-proxy.ts`) out of client components; put shared types and constants in a
  client-safe file (as `passwords.ts` and `http-error.ts` do).
- Never put the JWT in a response body, a log line or client code. Never write passwords, security answers or tokens to a log.
- Every screen must be responsive (320px phone up to desktop) and every call to the backend counts against the user's daily request limit: no polling.
- Tunables go in env vars and are documented in `.env.local.brite`; user-facing text that quotes them (`faq.ts`,
  `legal.ts`) reads the same variables.
- Bump `NOTICE_VERSION` (`CookieNotice.tsx`, now "2") and `LAST_UPDATED` (`lib/legal.ts`) when wording or cookie use changes.
