@AGENTS.md

# Brite Banking UI Portal: project rules

Next.js 16 (App Router, React 19, TypeScript) front end for the Spring banking service (`bankingservices`, port 8081, context path `/brite`).
Two portals: customers at `/`, employees under `/staff`. Read the layer skill in `.claude/skills/` before changing that layer, and the docs in
`.claude/docs/` (start with `overview.md`). Screens, routes and env vars are in `README.md`.

## Architecture in one paragraph

The backend owns identity, authorisation and money. The browser only calls this app's own `/api/*` route handlers; they keep the backend's JWT in
an httpOnly cookie and forward to the BFF (`/bff/v1/portal/*`, `/bff/v1/staff/*`) with `Authorization: Bearer`. `proxy.ts` only routes people to
the right portal. Never decide permissions in the portal (hiding a button is a convenience; the backend enforces), never put the token in a
response body, a log or client code, and never touch the banking database directly: use the BFF endpoints only. The portal stores nothing on disk.

## Rules that are easy to break

- **Every screen is responsive**, from a 320px phone (iPhone, Samsung) to a wide desktop: fluid widths, wrapping text, 44px touch targets, wide
  tables in `.table-wrap`. Add each new route to `e2e/mobile.spec.ts`, which fails on sideways overflow.
- **Daily request limit (backend 429).** Show it only as the one-time pop-up (`RateLimitNotice`), when first exceeded, never as a red inline
  message; always render API errors through `ErrorMessage` (it swaps that text for a grey "not available right now" note). Call the backend only
  when needed: "Logins today" is fetched once per page load, never on a timer, because every call counts against the user's daily limit.
- **Sign-in refusals come from the backend**: a customer with no ACTIVE account (SUSPENDED, CLOSED, INACTIVE, DORMANT) gets a 403 message that the
  sign-in screen shows verbatim. Don't reword it or work around it.
- Irreversible or side-effecting calls only on an explicit user action: close account, and Generate statement (it emails/SMSes a copy).
- Never log passwords, security answers or tokens. Passwords are exactly 8 digits.
- Customers can only ever see their own account(s); staff actions depend on the role's privileges.
- **Staff withdraw rule:** the withdraw form is pre-filled with the customer's address (`holderAddress` from the overview) and, for staff only, has a
  required checkbox "I verified the customer's address" that must be ticked before it can be submitted. Keep it required; it is withdraw-only.
- Text that quotes configuration (`lib/faq.ts`, `lib/legal.ts`) must read the same env var as the behaviour. Bump `LAST_UPDATED` in `lib/legal.ts`
  and `NOTICE_VERSION` in `components/CookieNotice.tsx` when their wording or cookie use changes.

## Checks and tests

- After a change: `npx tsc --noEmit` and `npx eslint .`; run the e2e specs you affected (`npx playwright test e2e/<spec>`).
- The e2e specs use the real backend and its daily request limit (1,000 a day per customer/employee, in MySQL): don't run the whole suite over
  and over for `customer0001`; use `customer0002` for repeats. A customer whose accounts aren't ACTIVE can't sign in. See `.claude/docs/testing.md`
  and the `e2e` skill. Never press the real Generate statement or Close account in a spec.
- One `next dev` per project folder (a second one refuses to start); the running one hot-reloads.

## Before committing to `main`

Before any commit to `main`, update the instructions so they stay in step with the code:

1. `README.md` for any screen, route, env var, rule or spec change.
2. The matching doc in `.claude/docs/` and the matching skill in `.claude/skills/` (`pages`, `components`, `lib`, `api-routes`, `request-gate`,
   `e2e`, `portal-conventions`); add new files and routes to them.
3. This file (`CLAUDE.md`) if a project rule, convention or workflow changed.
4. `tsc` and `eslint` pass; only the files you meant to change are staged. Leave out `.env.local`, `.idea/` and the generated root `AGENTS.md`
   (`next dev` rewrites it) unless asked.
