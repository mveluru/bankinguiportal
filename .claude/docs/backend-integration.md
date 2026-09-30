# Calling the banking backend

How the portal talks to the Spring Boot banking service (`springbootexampleprojects`, context path `/brite`, port
8081). All calls go through one client, `lib/api.ts`, and are made **from the browser**. Route handlers in `app/api/`
never call the banking service; they only serve the demo identity layer (see [api-routes.md](api-routes.md)).

## Two paths to the same backend

```
                       ┌──────────────────────────── Path A: BFF (direct, CORS) ───────────────────────────┐
Browser ─ lib/api.ts ──┤  fetch NEXT_PUBLIC_API_BASE_URL + /bff/v1/portal/...  ──────────────► Spring :8081 │
 (client components)   │                                                                                    │
                       └──────────────────────── Path B: same-origin proxy (rewrite) ──────────────────────┘
                          fetch /api/banking/v1/api/...  ─► proxy.ts (session check) ─► next.config.ts rewrite
                                                               ─► BANKING_BACKEND_URL + /v1/api/... ─► Spring :8081
```

| | Path A: BFF | Path B: proxy |
|---|---|---|
| Base (constant in `lib/api.ts`) | `BASE` = `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8081/brite`) | `PROXY` = `/api/banking` |
| Endpoints | `/bff/v1/portal/*`, built for this UI, one call per screen | `/v1/api/accounts/*`, the general banking API |
| Why | The backend enables CORS for `/bff/**` only (origin allow-list `banking.portal.allowed-origins`, includes `http://localhost:3000`) | No CORS on these endpoints, so the browser calls its own origin and Next forwards the request server-side |
| Session gate | None. The browser talks straight to Spring | `proxy.ts` returns 401 JSON if the session cookie is missing or invalid |
| Env var | `NEXT_PUBLIC_API_BASE_URL` (public: inlined into the browser bundle) | `BANKING_BACKEND_URL` (server-side only, read in `next.config.ts`) |

The rewrite is defined in `next.config.ts`: `/api/banking/:path*` → `${BANKING_BACKEND_URL}/:path*`
(default `http://localhost:8081/brite`).

## Endpoint catalogue

Every function in `lib/api.ts`, what it calls, and which screen uses it.

| Function | Method and URL | Path | Used by |
|---|---|---|---|
| `getHome(state?)` | `GET /bff/v1/portal/home?state=` | A | `/` (accounts plus branches/ATMs) |
| `getOverview(accountNumber, days?)` | `GET /bff/v1/portal/accounts/{n}/overview?days=` | A | account overview, deposit, withdraw and close screens |
| `openAccount(body)` | `POST /bff/v1/portal/accounts/open` | A | `/accounts/open` |
| `suspendAccount(n, body)` | `POST /bff/v1/portal/accounts/{n}/suspend` | A | suspend screen. Returns the refreshed overview |
| `updateSuspension(n, body)` | `PATCH /bff/v1/portal/accounts/{n}/suspension` | A | suspend screen (change end / notes) |
| `reactivateAccount(n)` | `POST /bff/v1/portal/accounts/{n}/reactivate` | A | suspend screen |
| `deposit(body)` | `POST /api/banking/v1/api/accounts/deposit` | B | deposit screen (`TransactionForm`) |
| `withdraw(body)` | `POST /api/banking/v1/api/accounts/withdraw` | B | withdraw screen (`TransactionForm`) |
| `getStatement(n, begin, end)` | `GET /api/banking/v1/api/accounts/{n}/statement?beginDate=&endDate=` | B | statement screen. **Side effect:** the backend also emails/SMSes the statement |
| `closeAccount(n)` | `POST /api/banking/v1/api/accounts/{n}/close` | B | close screen. **Irreversible:** no reopen, and no zero-balance check |

Account numbers are always passed through `encodeURIComponent`.

## What every request carries

The shared `request<T>()` helper in `lib/api.ts` adds to every call:

- `Content-Type: application/json`
- `X-Customer-Id`: the signed-in user's customer ID. `AuthProvider` sets it with `setCustomerId` after sign-in. Before that
  it falls back to `NEXT_PUBLIC_CUSTOMER_ID` (default `demo-customer`). **It is a rate-limit key only, not
  authentication.**
- `cache: "no-store"`, so balances and activity are never served stale.

No session cookie, token or password is ever forwarded to the banking service.

## Responses, DTOs and errors

- Request and response shapes live in `lib/types.ts`, which mirrors the BFF DTOs
  (`org.bee.banking.bff.dto`). Change it only when the backend DTO changes.
- Withdraw, deposit and close return the raw `AccountApiResponse`, where only the balance matching the account type is
  set. `toResult` in `lib/api.ts` normalises it to `{ accountNumber, accountType, balance }`.
- The holder form fields Middle and Country are **not** part of any request body: the backend has no fields for them.
  Phone is sent as `phoneNumber` by `openAccount` only; the overview returns it masked (`maskedPhoneNumber`, last four
  digits).
- Account status is `ACTIVE | SUSPENDED | CLOSED`. A suspended account (`suspended`, `suspendedUntil`, null =
  indefinite) rejects withdraw/deposit with a 400; the UI hides those actions and explains why. Home also returns
  `totalSuspendedAccounts` and lists suspended accounts.
- Errors are turned into a message by `errorMessage()` and thrown as `ApiError`:
  - Spring bean-validation failures arrive as JSON with `errors[].defaultMessage`; those are joined with `; `.
  - Business-rule failures arrive as plain text (or a JSON `message` / `error`) and are shown as is.
  - A network failure, or a rate-limit response (429 has no CORS headers, so the browser reports it as a network
    error), becomes: "Cannot reach the banking service. It may be down, or you may be rate limited."
- Screens show `ApiError.message` with `ErrorMessage` from `StateBlock`.

## Security notes

- **The banking backend does not authenticate requests.** The portal's sign-in is a front-end-only demo, and the BFF
  endpoints (Path A) are reachable directly by anyone who can reach the service. Real auth has to be added to the
  Spring service (see its "Auth (not built yet)" note).
- `proxy.ts` protects only what goes through Next: pages and `/api/banking/*` (Path B). It cannot protect Path A,
  because that traffic never touches the Next server.
- `NEXT_PUBLIC_*` values are visible in the browser. Never put secrets in them.

## Adding a new backend call

1. Add the request and response types to `lib/types.ts`.
2. Add a function to `lib/api.ts` using `request<T>()`.
   - Endpoint under `/bff/**` (CORS-enabled): use the default base.
   - Any other endpoint: pass `PROXY` as the third argument, and use the path *without* the context path
     (for example `/v1/api/...`); the rewrite adds `/brite`.
3. Call it from a client component. If it emails, texts or deletes something, only call it on an explicit user
   action.
4. Update the endpoint table above and the screen table in the repo-root `README.md`.

## Running locally

1. Start the backend on port 8081 (context path `/brite`).
2. `cp .env.local.brite .env.local` and keep the defaults: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_CUSTOMER_ID`,
   `BANKING_BACKEND_URL`.
3. `npm run dev`. Restart after changing any of these, because they are read at startup.
