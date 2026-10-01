# Calling the banking backend

How the portal talks to the Spring Boot banking service (`bankingservices`, context path `/brite`, port 8081). The backend
has two BFF controller groups, and each has a matching proxy here:

| Backend controllers | Base path | Token | Proxy here |
|---|---|---|---|
| `CustomerPortalAuthController` (sign-in, password, security questions, reset) and `CustomerPortalController` (home, account overview, deposit, withdraw, close, statement) | `/bff/v1/portal` | customer JWT | `/api/portal/[...path]` |
| `StaffPortalAuthController` (sign-in, password, security questions, reset, employee login status/password) and `StaffPortalController` (accounts, employees) | `/bff/v1/staff` | employee JWT | `/api/staff/[...path]` |
| `CustomerPortalAuthController`'s `/staff/customers/{id}/login`, `/login-status`, `/password` | `/bff/v1/staff` | employee JWT | `/api/staff/[...path]` |

```
Browser ─ lib/api.ts ─► /api/portal|staff/...  ─► lib/bff-proxy.ts ─► BANKING_BACKEND_URL + /bff/v1/{portal|staff}/...
                         (same origin, cookies)    adds Authorization: Bearer <bank_token>, X-Customer-Id
```

The browser never calls the backend, so there is no CORS to configure and the JWT never reaches client code. The sign-in
call is the only one that does not go through the proxy: `POST /api/auth/login` (`app/api/auth/login/route.ts`) calls the
backend's login, stores the token in the httpOnly `bank_token` cookie and returns just the profile.

## What every request carries

`lib/backend.ts` adds to every call:

- `Authorization: Bearer <JWT>` (from the cookie; absent before sign-in and on the open calls).
- `X-Customer-Id`: the gateway's rate-limit key. It is the customer id, the employee number, or the caller's IP before
  sign-in. **A rate-limit key only, not authentication.**
- `Content-Type: application/json`, `cache: "no-store"`.

## Auth rules the backend enforces (and the UI reflects)

- Customer JWT on `/portal/*` (except sign-in, the question catalog and the two reset calls); employee JWT on `/staff/*`
  (same exceptions). The wrong type is **403**; a missing, invalid, expired or revoked token is **401**. 30 minute tokens, no refresh.
- The token only proves who you are. The login status (`ACTIVE` only may transact) and the employee's role privileges are re-read on
  every call, so a suspension or demotion applies at once.
- Customers reach only their own accounts (someone else's is 403). Suspend, update-suspension, reactivate and open-account exist only on `/staff`.
- Passwords are exactly 8 digits. A password change or reset revokes every earlier token.
- Sign-in: 401 wrong credentials, 423 locked, 403 login not active, 400 missing field.

## Endpoint catalogue

| `lib/api.ts` | Method and URL (under `/api/portal` or `/api/staff`) | Used by |
|---|---|---|
| `getHome(state?)` | `GET /home?state=` (portal) | customer home |
| `accountsApi(kind).getOverview(n, days?)` | `GET /accounts/{n}/overview?days=` | account detail, forms |
| `accountsApi(kind).deposit/withdraw(body, locationId?)` | `POST /accounts/deposit`, `/withdraw` (staff: `?locationId=`) | `TransactionForm` |
| `accountsApi(kind).closeAccount(n)` | `POST /accounts/{n}/close`. **Irreversible** | `CloseAccount` |
| `getStatement(n, begin, end)` | `POST /accounts/{n}/statement?beginDate=&endDate=` (portal). **Side effect:** also emails/SMSes the statement | statement page |
| `openAccount(body)` | `POST /accounts/open` (staff, OPEN_ACCOUNT) | `OpenAccount` |
| `suspendAccount`, `updateSuspension`, `reactivateAccount` | `POST /accounts/{n}/suspend`, `PATCH .../suspension`, `POST .../reactivate` (staff) | `SuspendAccount` |
| `listEmployees`, `getEmployee` | `GET /employees?role=&page=&size=`, `GET /employees/{n}` (staff, MANAGE_EMPLOYEES) | employees pages |
| `setEmployeeLoginStatus`, `setEmployeePassword` | `PUT /employees/{n}/login-status`, `PUT /employees/{n}/password` | employee page |
| `createCustomerLogin`, `setCustomerLoginStatus`, `setCustomerPassword` | `POST /customers/{id}/login`, `PUT .../login-status`, `PUT .../password` (staff, MANAGE_CUSTOMER_LOGINS) | customer logins page |
| `credentialsApi(kind).changePassword` | `PUT /password` | change password |
| `credentialsApi(kind).questionCatalog / setSecurityQuestions` | `GET /security-questions/catalog`, `PUT /security-questions` | security questions |
| `credentialsApi(kind).resetQuestions / resetPassword` | `POST /password-reset/questions`, `POST /password-reset` (open) | forgot password |

Account numbers are always passed through `encodeURIComponent`.

## Responses, DTOs and errors

- Shapes live in `lib/types.ts`, mirroring the backend DTOs (`org.brite.banking.bff.dto`, `domain`, `request`). Change it only when the backend changes.
- Withdraw, deposit and close return the refreshed `AccountOverviewResponse`; `lib/api.ts` reduces withdraw/deposit to `AccountResult`.
- The holder form fields Middle and Country are **not** part of any request body. Phone is sent as `phoneNumber` by `openAccount` only.
- A suspended account rejects withdraw/deposit with a 400; the UI hides those actions and explains why.
- Errors become a message via `readErrorMessage` (`lib/http-error.ts`) and are thrown as `ApiError` (with `status`): bean-validation JSON
  (`errors[].defaultMessage`, joined with `; `), or plain text from business rules, shown as is. A proxy failure (backend down) is a 502 with a message.

## Security notes

- The JWT is in an httpOnly cookie (`Secure` in production) and is never in a response body or client code. The profile cookie
  is display data only.
- `proxy.ts` and the UI's hidden buttons are convenience. The backend enforces authentication, ownership and privileges.
- `lib/bff-proxy.ts` refuses `..`, `login` and cross-site `Origin`, and clears the cookies on a 401 or a password change.
- Never log passwords, security answers or tokens.

## Adding a new backend call

1. Add the request and response types to `lib/types.ts`.
2. Add a function to `lib/api.ts` using `request<T>()` against `ROOT.customer` or `ROOT.staff`. No new route handler is needed: the catch-all proxies forward any path under `/bff/v1/portal` or `/bff/v1/staff`.
3. Call it from a client component. If it emails, texts or deletes something, only on an explicit user action.
4. Update the table above and the screen tables in the repo-root `README.md`.

## Running locally

1. Start the backend on port 8081 (context path `/brite`).
2. `cp .env.local.brite .env.local` (defaults are fine): `BANKING_BACKEND_URL`, `BFF_PORTAL_PATH`, `BFF_STAFF_PATH`.
3. `npm run dev`. Restart after changing these, because they are read at startup. Sign in with the backend's demo data (see the README).
