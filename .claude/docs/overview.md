# Design overview

How the Brite Banking UI Portal is laid out: what each folder is for, what every file in `lib/` and `components/`
does, and how a request moves through them. For screens and environment variables see `README.md` (repo root) and
`.env.local.brite`.

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

## 7. Conventions

- Import with the `@/` alias (`@/lib/session`, `@/components/NavBar`).
- Keep server-only modules (`backend.ts`, `bff-proxy.ts`) out of client components; put shared types and constants in a
  client-safe file (as `passwords.ts` and `http-error.ts` do).
- Never put the JWT in a response body, a log line or client code. Never write passwords, security answers or tokens to a log.
- Every screen must be responsive (320px phone up to desktop) and every call to the backend counts against the user's daily request limit: no polling.
- Tunables go in env vars and are documented in `.env.local.brite`; user-facing text that quotes them (`faq.ts`,
  `legal.ts`) reads the same variables.
- Bump `NOTICE_VERSION` (`CookieNotice.tsx`, now "2") and `LAST_UPDATED` (`lib/legal.ts`) when wording or cookie use changes.
