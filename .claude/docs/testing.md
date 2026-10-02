# End-to-end tests (`e2e/`)

Playwright specs that drive the real portal in Chrome against the **real backend** (`npm run test:e2e`; needs the backend on 8081 and Google
Chrome). The config (`playwright.config.ts`) runs one worker, reuses a dev server already on port 3000, and otherwise starts one. Rules for
writing specs are in the [e2e skill](../skills/e2e/SKILL.md).

## Demo data the specs sign in with

All from the backend's `db/data` seeds (local use only). Defaults live in `e2e/helpers.ts`; every one can be overridden with an env var.

| Who | Username / password | Notes | Env overrides |
|---|---|---|---|
| Customer A | `customer0001` / `20260001` | owns checking account `CH-0000088291` (the account most specs use) | `E2E_USER`, `E2E_PASSWORD`, `E2E_ACCOUNT` |
| Customer B | `customer0002` / `20260002` | Bob Jones, savings `SV-0000044102`, customer id 2 | `E2E_USER_B`, `E2E_PASSWORD_B`, `E2E_ACCOUNT_B`, `E2E_CUSTOMER_ID_B` |
| Area manager | `priya.raman` / `20260001` | all privileges, no branch | `E2E_STAFF_USER`, `E2E_STAFF_PASSWORD` |
| Teller | `lucas.meyer` / `20260010` | `EMP-000010`, has a branch, no suspend/reactivate/admin privileges | `E2E_TELLER_USER`, `E2E_TELLER_PASSWORD` |

`E2E_PORT` changes the dev-server port. A customer whose accounts are not ACTIVE cannot sign in (the backend refuses it), so Customer A's
specs need `CH-0000088291` to be active.

## The specs

| Spec | What it checks |
|---|---|
| `portal.spec.ts` | Customer Dashboard and account screens, Statements form, the one-time welcome banner (once, gone on navigation and after 20 s, heading Welcome → Dashboard), the "Customer since" panel, the daily-limit pop-up |
| `customer-account.spec.ts` | Customer B: lookup box pre-filled and read-only, View shows details, older-session fallback, Statements with print and CSV (Generate is mocked), grey note when details can't load |
| `staff.spec.ts` | Staff sign-in, role button and permissions, lookup, employees list, teller restrictions, reactivate page, customer and employee rate-limit panels (PUT mocked), sign-out |
| `login-count.spec.ts` | "Logins today: N" beside Sign out (mocked and live, once per page load, 320px layout), Sign out styled like Dark, blocked-sign-in message |
| `blocked-login.spec.ts` | SUSPENDED, CLOSED, INACTIVE and DORMANT sign-ins show the backend's message and start no session; one real-backend check |
| `close-dialog.spec.ts` | Close account asks Yes/No; only No is clicked, so nothing is closed |
| `idle.spec.ts` | Idle sign-out after 2 minutes (fake clock) and activity keeping the session alive |
| `suspended.spec.ts` | **Changes data:** staff suspend `CH-0000088291`, the customer is refused sign-in, staff reactivate, the customer signs in again; the cleanup reactivates through the API even if a step fails; skips itself unless the account is active |
| `mobile.spec.ts` | Every customer, staff and signed-out screen on iPhone 15, iPhone 13 Pro Max, Galaxy S24 and the 320px Galaxy S9+: fails on sideways overflow |

## The backend's daily request limit

The backend allows each customer, and each employee, **1,000 requests a day** (a manager can change one person's limit on the Customer logins
screen, an area manager an employee's on the employee screen). The count is kept in MySQL per customer id or employee number, so it survives
a backend restart; it starts again on the next calendar day. A full run is a few hundred requests for Customer A, so several full runs in
one day use it up, and then every screen for that customer fails to load. What to do: raise that customer's limit on the Customer logins
screen, wait for the next day, or run the specs with Customer B (`customer-account.spec.ts`). Sign-in and password-reset calls are counted
separately by IP, in the backend's memory.

## Side effects to avoid

- **Generate statement** emails/SMSes a copy, so specs never press it for real (they mock the response).
- **Close account** is irreversible, so specs only click No.
- Anything that changes data restores it, preferably through the API in a `finally`.
