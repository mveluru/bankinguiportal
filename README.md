# Brite Banking UI Portal

Next.js (App Router, React 19, TypeScript) front end for the banking module of
[bankingservices](https://github.com/mveluru/bankingservices). It has two portals on the backend's BFF endpoints: a
**customer portal** (`/bff/v1/portal/*`) and a **staff portal** (`/bff/v1/staff/*`, under `/staff` here). The backend
issues the JWTs and enforces every rule; the portal holds no users of its own.

The browser only calls this app's own `/api/*` route handlers. They keep the JWT in an httpOnly cookie and forward to the
BFF with `Authorization: Bearer`, so scripts in the page never see the token.

### Customer portal

| Screen | Route | Backend call (via `/api/portal/*`) |
|---|---|---|
| Sign in | `/login` | `POST /portal/login` (via `/api/auth/login`) |
| Forgot password (username, three security answers, new password) | `/forgot-password` | `POST /portal/password-reset/questions`, `POST /portal/password-reset` |
| Home (the same "Go to account number" box and details panel, then your accounts and branches/ATMs with a state filter) | `/` | `GET /portal/home?state=` |
| Statements: choose an account and a date range, then print it or download it as CSV (backend also emails/SMSes it) | `/statements` | `GET /portal/home`, `POST /portal/accounts/{n}/statement?beginDate=&endDate=` |
| Account overview (balance + activity) | `/accounts/[accountNumber]` | `GET /portal/accounts/{n}/overview?days=` |
| Deposit / Withdraw | `/accounts/[accountNumber]/deposit`, `/withdraw` | `POST /portal/accounts/deposit`, `/withdraw` |
| Statement (date range; backend also emails/SMSes it) | `/accounts/[accountNumber]/statement` | `POST /portal/accounts/{n}/statement?beginDate=&endDate=` |
| Close account (typed confirmation plus Yes/No dialog, irreversible) | `/accounts/[accountNumber]/close` | `POST /portal/accounts/{n}/close` |
| Settings: appearance (system/light/dark), links to password and security questions | `/settings` | none |
| Change password (8 digits; signs you out everywhere) | `/settings/password` | `PUT /portal/password` |
| Security questions (choose and answer three) | `/settings/security-questions` | `GET /portal/security-questions/catalog`, `PUT /portal/security-questions` |

Customers cannot open, suspend or reactivate accounts: those are staff-only in the backend.

### Staff portal (employees; what you see depends on your role's privileges)

| Screen | Route | Backend call (via `/api/staff/*`) |
|---|---|---|
| Staff sign in | `/staff/login` | `POST /staff/login` (via `/api/auth/login`) |
| Forgot password | `/staff/forgot-password` | `POST /staff/password-reset/questions`, `POST /staff/password-reset` |
| "Brite Dashboard" (centred title, welcome banner beneath it, "Go to account number": a blank box for up to 16 characters; View opens the account's details in a big square box on the right of the same screen, scrollable both ways). The employee's role (Area Manager / Manager / Teller) is above the Dashboard button in the left panel; clicking it lists what the role allows. A branch, if the employee has one, is shown under the brand in the top bar | `/staff` | none (from the sign-in response) |
| Account overview for any account (VIEW_ACCOUNT) | `/staff/accounts/[accountNumber]` | `GET /staff/accounts/{n}/overview?days=` |
| Deposit / Withdraw (DEPOSIT / WITHDRAW; area managers name a branch id) | `/staff/accounts/[accountNumber]/deposit`, `/withdraw` | `POST /staff/accounts/deposit`, `/withdraw` (`?locationId=`) |
| Suspend an account, or change a suspension's end/notes (SUSPEND_ACCOUNT, UPDATE_SUSPENSION; managers and area managers only, others are redirected to the dashboard) | `/staff/accounts/[accountNumber]/suspend` | `POST .../suspend`, `PATCH .../suspension` |
| Reactivate a suspended account (REACTIVATE_ACCOUNT; managers and area managers only) | `/staff/accounts/[accountNumber]/reactivate` | `POST .../reactivate` |
| Close account (CLOSE_ACCOUNT, irreversible) | `/staff/accounts/[accountNumber]/close` | `POST /staff/accounts/{n}/close` |
| Open an account for a customer (OPEN_ACCOUNT) | `/staff/accounts/open` | `POST /staff/accounts/open` |
| Customer logins: create, set status, set password (MANAGE_CUSTOMER_LOGINS) | `/staff/customers` | `POST /staff/customers/{id}/login`, `PUT .../login-status`, `PUT .../password` |
| User management: employees list by role (MANAGE_EMPLOYEES) | `/staff/employees` | `GET /staff/employees?role=&page=&size=` |
| One employee: card, set login status, set password (MANAGE_EMPLOYEES) | `/staff/employees/[employeeNumber]` | `GET /staff/employees/{n}`, `PUT .../login-status`, `PUT .../password` |
| Settings, change password, security questions | `/staff/settings`, `/password`, `/security-questions` | `PUT /staff/password`, `PUT /staff/security-questions` |

### Both

| Screen | Route | Backend call |
|---|---|---|
| Terms of Use and Privacy Policy (public; linked from the footer) | `/terms`, `/privacy` | none (server components) |
| Help & FAQ (public, searchable, deep-linkable e.g. `/help#locked-out`) | `/help` | none (server component; `SUPPORT_EMAIL` optional) |

## Run

1. Start the backend (port 8081, context path `/brite`). The browser never calls it, so no CORS setup is needed.
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

`npm run test:e2e` runs against the real backend in Chrome (needs the backend running and Google Chrome installed). It
reuses a dev server already on port 3000, or starts one. It signs in with the backend's demo data
(`customer0001` / `20260001`, who owns `CH-0000088291`, and the area manager `priya.raman` / `20260001`), checks the home,
account and staff screens, the idle logout and the close-account Yes/No dialog. Only `e2e/suspended.spec.ts` changes
data (staff suspend, then reactivate, an account); it skips itself unless the account is active. Override the defaults
with `E2E_USER`, `E2E_PASSWORD`, `E2E_STAFF_USER`, `E2E_STAFF_PASSWORD`, `E2E_ACCOUNT` and `E2E_PORT`.

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

- **Environment variables** are not in git (`.env.local` is gitignored), so set them on the host. The one that matters is
  `BANKING_BACKEND_URL` (the banking service, read when the server starts); see `.env.prod.brite` for the rest.
  `NEXT_PUBLIC_*` values (`NEXT_PUBLIC_SESSION_WARNING_SECONDS`, `NEXT_PUBLIC_IDLE_TIMEOUT_SECONDS`) are baked into the
  browser bundle during `npm run build`, so set them *before* building.
- **No state on disk:** the portal keeps no users, sessions or logs of its own, so there is nothing to persist or back up.
- **Banking backend:** only the Next server calls it, so it can sit on an internal address. The browser never needs
  access, and `banking.portal.allowed-origins` (CORS) is not used by this portal. The JWT signing key
  (`BANKING_JWT_SECRET`) and token lifetime (`banking.jwt.expiration-minutes`, 30) are the backend's settings.
- **HTTPS:** serve behind a TLS-terminating proxy; the sign-in cookies are marked Secure in production, so over plain
  HTTP sign-in appears to loop. The portal passes `X-Forwarded-For` to the backend's rate limiter before sign-in.

## Docs

Architecture and per-layer reference live in [`.claude/docs/`](.claude/docs/index.md) (start with `overview.md`). Rules
for changing each layer are skills in [`.claude/skills/`](.claude/skills/), one `SKILL.md` per layer.

## Notes
- **Sign-in is the backend's.** `POST /api/auth/login` calls `/bff/v1/portal/login` or `/bff/v1/staff/login` and stores the
  returned JWT in the httpOnly `bank_token` cookie (lifetime = the token's own `exp`; the backend issues 30 minutes, no
  refresh). A second httpOnly cookie, `bank_profile`, holds the name, role, privileges and branch for display. Neither is
  trusted for access: the backend re-checks the token and the login status on every call, so suspending a login, demoting
  an employee or changing a password applies at once. Passwords are exactly 8 digits.
- **Layout.** Every feature is a button in the left-hand panel (light-blue background, `components/SideNav.tsx`), shown only when signed
  in; Sign out is a button in the top bar, just left of the Dark/Light switch; the top bar holds the brand (with the employee's name and id for staff) and the theme switch. Staff see only the buttons their
  role's privileges allow (tellers get no "Customer logins" or "UserMgnt"). On a phone the panel becomes a strip of buttons above the page.
  The sign-in screens put the form in a card at the top right, a little below the header, with a short welcome on the left.
- **Phones.** Every screen is checked on iPhone and Samsung profiles (iPhone 15, 13 Pro Max, Galaxy S24 and the 320px-wide Galaxy S9+) by
  `e2e/mobile.spec.ts`, which fails if anything sticks out past the screen edge. On a phone the left panel is a compact wrap of buttons
  above the page (Sign out in the same row) and tables scroll sideways inside their own box. Print styles hide the chrome when printing a statement.
- **Welcome headline.** Right after sign-in the landing screen shows a one-time banner: customers `Welcome! First Last · customer since YEAR`,
  staff `Welcome First Last EMP-000001`. It is built by `POST /api/auth/login`, held in `sessionStorage` only across the sign-in page
  load and removed when read, so a reload, any navigation, sign-out or 20 seconds on screen clears it (`lib/greeting.ts`, `components/Greeting.tsx`). The
  backend has no "customer since" field, so the year is the earliest account date in the sign-in response (the newest open accounts only).
- **Two portals, two token types.** `proxy.ts` sends a customer to `/` and an employee to `/staff`, and everyone else to
  the matching sign-in page. It reads only the token's type and expiry; the backend is the real access control (a customer
  token on a staff call is 403, and vice versa). The UI hides actions the role lacks, but never relies on that.
- **Session end.** `components/SessionTimeout.tsx` counts down to the token's expiry (`NEXT_PUBLIC_SESSION_WARNING_SECONDS`,
  default 120) and signs out at expiry; there is no "stay signed in" because the backend has no refresh. Independently,
  `components/IdleLogout.tsx` signs out after `NEXT_PUBLIC_IDLE_TIMEOUT_SECONDS` (default 120) without activity on any
  tab and lands on the sign-in page with `?expired=1`. Changing a password revokes every earlier token, so the portal
  signs the user out and asks them to sign in again.
- **Forgot password** is the backend's security-question flow: the user must have saved three answers in Settings first. A
  reset never undoes a lock or suspension an employee set.
- `X-Customer-Id` is the backend gateway's rate-limit key, sent by the route handlers (customer id, employee number, or
  the caller's IP before sign-in). A 429 from the backend reaches the browser as a normal 429 message.
- The cookie banner (`components/CookieNotice.tsx`) is deliberately a *notice*, not a consent prompt: the portal sets only
  strictly necessary cookies plus the theme you pick. Terms (`/terms`) and Privacy (`/privacy`) are public server
  components in `lib/legal.ts`, with a visible "template" notice until `LEGAL_REVIEWED=true`; update `LAST_UPDATED`
  whenever the wording changes. Help & FAQ (`/help`) is public and renders per request.
- Withdraw and deposit validate the holder's name and address in the backend but do not use them, so the forms collect
  them (names are prefilled).
- The demo data of the backend's `db/data` seeds (customer logins `customer0001`.. with password `2026` + sequence, employee
  logins named after the email, e.g. `priya.raman`) is for local use only.
