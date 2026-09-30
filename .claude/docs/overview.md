# Design overview

How the Brite Banking UI Portal is laid out: what each folder is for, what every file in `lib/` and `components/`
does, and how a request moves through them. For screens and environment variables see `README.md` (repo root) and
`.env.local.brite`.

> This project uses a newer Next.js (16.x) than most docs describe. Before changing framework-level code, read the
> matching guide in `node_modules/next/dist/docs/`. Note that the request gate is `proxy.ts` (formerly `middleware.ts`).

## 1. Big picture

```
Browser ──► proxy.ts (session gate) ──► app/ pages (React 19, App Router)
                                            │  client calls
                    ┌───────────────────────┼─────────────────────────────┐
                    ▼                       ▼                             ▼
      app/api/auth|admin/*          lib/api.ts ──► Spring BFF      /api/banking/* rewrite
      (Next route handlers:         (/bff/v1/portal/*, CORS)       (next.config.ts) ──► Spring
       demo auth, 2FA, prefs, …)                                    withdraw/deposit/statement/close
                    │
                    ▼
      lib/*.ts server modules ──► .data/*.json and .data/audit.log (gitignored, mode 600)
```

Two backends, deliberately separate (details of the banking calls: [backend-integration.md](backend-integration.md)):

- **The Spring banking service** owns money: accounts, balances, transactions, locations. The browser reaches it
  through `lib/api.ts`, either directly (BFF endpoints, CORS-enabled) or through the same-origin `/api/banking/*`
  rewrite (endpoints without CORS).
- **The Next.js server** owns the *demo* identity layer: sign-in, sessions, 2FA, preferences, notifications, audit,
  admin. This is front-end-only demo auth, not real security. State lives in flat files under `.data/`.

## 2. Folder map

| Path | Purpose |
|---|---|
| `app/` | Routes (App Router). One folder per URL segment; `page.tsx` is the screen, `route.ts` is an HTTP endpoint. |
| `app/api/` | Server-only route handlers: `auth/*` (login, logout, me, refresh, password, forgot/reset, profile, preferences, notifications, activity, `2fa/*`) and `admin/users`. |
| `components/` | Shared React components used by more than one page (or by the root layout). |
| `lib/` | Non-visual code: types, API client, formatting, and the server-side stores and security helpers. |
| `proxy.ts` | Runs before every matched request; redirects signed-out visitors to `/login` and returns 401 for API calls. |
| `next.config.ts` | Rewrites `/api/banking/*` to `BANKING_BACKEND_URL`. |
| `public/` | Static assets served as-is. |
| `.data/` | Runtime state created on demand (users, 2FA, lockouts, resets, prefs, audit log). Gitignored; never commit. |
| `.env.local.brite` | Template for `.env.local`. Every tunable (session length, lockout, demo users, …) is an env var. |
| `.claude/` | Claude Code project files, not part of the app: `CLAUDE.md` / `AGENTS.md` (instructions), `docs/` (these reference docs, split by layer), `skills/` (rules per layer, one `SKILL.md` each). |
| `eslint.config.mjs`, `tsconfig.json` | Lint and TypeScript config. The `@/` import alias maps to the repo root. |

## 7. Conventions

- Import with the `@/` alias (`@/lib/session`, `@/components/NavBar`).
- Keep server-only modules out of client components; put shared types and constants in a client-safe file
  (as `audit-events.ts` and `preferences-shared.ts` do).
- Never write passwords, codes, tokens or recovery codes to the audit log.
- Tunables go in env vars and are documented in `.env.local.brite`; user-facing text that quotes them (`faq.ts`,
  `legal.ts`) reads the same variables.
- Bump `NOTICE_VERSION` (`CookieNotice.tsx`) and `LAST_UPDATED` (`lib/legal.ts`) when wording or cookie use changes.
