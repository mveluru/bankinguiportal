# Design

How the Brite Banking UI Portal is laid out: what each folder is for, what every file in `lib/` and `components/`
does, and how a request moves through them. For screens and environment variables see `README.md` and
`.env.local.example`.

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

Two backends, deliberately separate:

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
| `.env.local.example` | Template for `.env.local`. Every tunable (session length, lockout, demo users, …) is an env var. |
| `.claude/` | Claude Code project instructions (`CLAUDE.md`, `AGENTS.md`). Not part of the app. |
| `eslint.config.mjs`, `tsconfig.json` | Lint and TypeScript config. The `@/` import alias maps to the repo root. |

## 3. `app/`: routes

Pages are server components unless a file starts with `"use client"`. Client pages handle forms and fetch data in
the browser; public content pages (`/terms`, `/privacy`, `/help`) render on the server.

| Route | Purpose |
|---|---|
| `layout.tsx` | Root layout: wraps everything in `AuthProvider`, renders `NavBar`, `SessionTimeout`, `CookieNotice`, the footer, and a pre-paint script that applies the saved theme (avoids a flash). |
| `globals.css` | All styling (plain CSS, CSS variables for light/dark). Shared classes such as `card`, `badge`, `muted`, `error`. |
| `page.tsx` | Home: accounts plus branches/ATMs with a state filter. |
| `login/`, `login/verify/` | Password step, then the 2FA code step. |
| `forgot-password/`, `reset-password/` | Password reset (link is printed to the dev console; no email service). |
| `accounts/[accountNumber]/` | Overview, plus `deposit`, `withdraw`, `statement`, `close`. `accounts/open/` opens a new account. |
| `settings/` | Hub (theme, activity window, notification categories) with `profile`, `password`, `two-factor`, `activity`. |
| `notifications/` | In-app notifications. |
| `admin/users/` | Admin user management (admins only). |
| `help/`, `terms/`, `privacy/` | Public content pages. |

### `app/api/`: route handlers

Thin controllers: parse the request, call a `lib/` module, audit, respond. Authenticated handlers verify the session
themselves; `/api/admin/*` uses `requireAdmin` (`lib/admin.ts`), which is the real admin access control (the nav
link is only convenience).

## 4. `lib/`: logic

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

## 5. `components/`

| Component | Type | Used for |
|---|---|---|
| `AuthProvider.tsx` | client | React context holding the signed-in user (`useAuth`): `login`, `verifyTwoFactor`, `logout`, `refresh`, `extendSession`, `expireSession`. Also sets the customer ID used by `lib/api.ts`. |
| `NavBar.tsx` | client | Header links, admin link, unread-notification badge (polled every minute), sign-out dialog, phone-width menu. |
| `SessionTimeout.tsx` | client | Countdown dialog before expiry with "Stay signed in"; signs out at expiry using the absolute expiry time. |
| `CookieNotice.tsx` | client | Dismissible cookie *notice* (not a consent prompt); remembered in localStorage, versioned. |
| `ThemeToggle.tsx` | client | Header light/dark switch. |
| `ThemePicker.tsx` | client | System/Light/Dark selector on the settings page; same storage as the toggle. |
| `TransactionForm.tsx` | client | Shared withdraw/deposit form; see [Transaction form layout](#transaction-form-layout). |
| `LocationCard.tsx` | server | One branch/ATM card on the home page. |
| `StateBlock.tsx` | server | `Loading` and `ErrorMessage` placeholders for fetch states. |
| `HelpCenter.tsx` | client | Searchable FAQ using native `<details>`. |
| `LegalDocument.tsx` | server | Renders a legal document with contents list and numbered sections. |

### Transaction form layout

`TransactionForm` serves both `/accounts/[accountNumber]/deposit` and `/withdraw` (`kind` prop), so any layout change
applies to both screens. Top to bottom:

1. Amount, and Deposit type (deposit only).
2. **Account holder details** subsection: a red `* indicates required` note, then First name\*, Middle and Last name\*
   in one row. First and last names are prefilled from the account overview.
3. **Address** subsection, fields in horizontal rows that wrap on narrow screens:
   Street\*, Address line 1\*, Address line 2, then City\*, State\*, ZIP\*, Country\* (default `USA`).
4. Error message, then the Deposit / Withdraw button.

Details:

- **ZIP** accepts digits only: an `onInput` handler strips anything else as it is typed, it is capped at 5 characters,
  and `inputMode="numeric"` brings up the numeric keypad on phones.
- **Middle and Country are UI-only.** The backend (`AccountHolderDetails` in `lib/types.ts`) has no fields for them, so
  they are collected but not sent. Its State (2 letters) and ZIP (5 digits) rules still apply, so a non-US country
  will fail validation.
- **Styling** lives in `app/globals.css`: `form.stack.wide` (wider form), `fieldset.subsection` (bordered group),
  `.req` (red asterisk), and `.narrow` labels (State, ZIP). Fields flex within `.row`.

## 6. Key flows

**Sign-in.** `login` page → `POST /api/auth/login` → lockout check → password check → if 2FA is on, set a 5-minute
signed *pending* cookie and go to `/login/verify`; otherwise issue the session cookie. Every step is audited.

**Every request.** `proxy.ts` verifies the session cookie. Public pages and auth endpoints pass; everything else
redirects to `/login` (pages) or returns 401 (`/api/*`). `verifySessionToken` also rejects sessions for disabled or
revoked accounts, so an admin action takes effect on the user's next request.

**Money operations.** Page → `lib/api.ts` → Spring BFF (or `/api/banking/*` rewrite). The Spring service is not
authenticated; the customer ID header is only a rate-limit key.

**Notifications.** No per-notification storage: `lib/notifications.ts` filters `audit.log` into plain-language items
for the user, and the badge counts entries newer than the stored "read up to" timestamp.

## 7. Conventions

- Import with the `@/` alias (`@/lib/session`, `@/components/NavBar`).
- Keep server-only modules out of client components; put shared types and constants in a client-safe file
  (as `audit-events.ts` and `preferences-shared.ts` do).
- Never write passwords, codes, tokens or recovery codes to the audit log.
- Tunables go in env vars and are documented in `.env.local.example`; user-facing text that quotes them (`faq.ts`,
  `legal.ts`) reads the same variables.
- Bump `NOTICE_VERSION` (`CookieNotice.tsx`) and `LAST_UPDATED` (`lib/legal.ts`) when wording or cookie use changes.
