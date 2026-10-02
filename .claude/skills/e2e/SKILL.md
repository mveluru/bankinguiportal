---
name: e2e
description: Rules for Playwright specs in e2e/ (demo users, the backend's daily request limit, mocking side effects, cleanup, mobile coverage). Use when adding, editing or running an e2e spec.
---

# End-to-end specs (`e2e/*.spec.ts`)

Docs: `../../docs/testing.md` (demo users, the spec inventory, the daily limit).

- Specs run against the **real backend**. Take sign-in details and accounts from `e2e/helpers.ts` (and its env overrides), never hard-code
  them in a spec. Customer A (`customer0001`, `CH-0000088291`), Customer B (`customer0002`, `SV-0000044102`), area manager `priya.raman`,
  teller `lucas.meyer`.
- **Mind the daily request limit.** The backend allows 1,000 requests a day per customer and per employee, kept in MySQL. A full run uses a few
  hundred for Customer A, so don't run the whole suite over and over: run the specs you changed, and use Customer B for repeat runs. When a customer
  is over the limit every screen for them fails to load, which makes specs fail for a reason that is not a bug. Check
  `GET /bff/v1/portal/rate-limit` (or the Customer logins screen) before blaming the code.
- **Side effects are mocked, never real:** Generate statement (it emails/SMSes) is answered with `page.route`; Close account only clicks No;
  rate-limit PUTs are mocked. If a spec must change data it restores it in a `finally`, through the API (a `request.post`), not by clicking
  through pages that may not have loaded.
- Wait properly: `isVisible()` does not wait, so use `expect(...).toBeVisible()` or `waitFor` before branching. Assert headings with
  `{ exact: true }` when another heading could contain the same word (the sign-in page has its own "Welcome to Brite Banking").
- A customer whose accounts are not ACTIVE cannot sign in (the backend's 403), so a spec that suspends an account must expect that, and
  reactivate it before signing the customer in again.
- Every new screen goes into `e2e/mobile.spec.ts` (customer, staff or signed-out list): it must fit a 320px phone. Stick-out and cut-off checks
  belong in the spec, not in a visual guess.
- A feature that needs a new backend field is tested with the mocked response (the real shape) plus one live spec that skips itself until the running backend
  returns it, so the suite stays green on an older backend and proves the real thing on a newer one.
- Keep one worker (`playwright.config.ts`): the specs share accounts, and `suspended.spec.ts` changes one.
- After a change: `npx tsc --noEmit`, `npx eslint e2e`, then run the affected specs. Update `.claude/docs/testing.md` when a spec is added or its
  data or behaviour changes.
