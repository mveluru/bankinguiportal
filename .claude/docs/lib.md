# Library (`lib/`)

**Client-safe** files have no `node:` or `next/headers` imports and can be imported from components. **Server-only** files
(`backend.ts`, `bff-proxy.ts`, plus `faq.ts` and `legal.ts`, which read env at render time) are imported only from route
handlers and server components.

### Client-safe

| File | Responsibility |
|---|---|
| `types.ts` | TypeScript mirrors of the backend's BFF DTOs and requests (accounts, locations, employees, login status, security questions) plus `SessionUser`. |
| `api.ts` | The browser's client: `accountsApi(kind)` (overview, deposit, withdraw, close), customer `getHome` / `getStatement`, staff open/suspend/reactivate, employees, customer logins, and `credentialsApi(kind)` (password, security questions, reset). Calls only `/api/portal/*` and `/api/staff/*`. |
| `http-error.ts` | `readErrorMessage`: the backend's two error shapes (plain text vs Spring JSON) as one string. |
| `session.ts` | Cookie names and options, `decodeToken` (claims read WITHOUT verifying; routing and display only), `tokenKind`, `homeOf` / `loginOf`. Edge-safe: `proxy.ts` imports it. |
| `greeting.ts` | The one-shot welcome headline: `saveGreeting` at sign-in, `loadGreeting` on the landing screen, `clearGreeting` on navigation or sign-out. Module state, because Next keeps hidden pages' component state alive. |
| `passwords.ts` | The 8-digit password rule for forms (the backend validates again). |
| `format.ts` | `formatMoney`, `accountLabel`, `titleCase`, `accountHref(kind, n, tail)`. |
| `duration.ts` | Turns configured seconds into words and parses positive numbers from env strings. |
| `navigation.ts` | `hardNavigate`: full page load for auth transitions, avoiding stale prefetched redirects. |

### Server-only

| File | Responsibility |
|---|---|
| `backend.ts` | `callBackend(kind, path, init)` to `BANKING_BACKEND_URL` + `BFF_PORTAL_PATH` / `BFF_STAFF_PATH` (adds Bearer, `X-Customer-Id`, `no-store`); `getSession()` reads the cookies; `rateKey()`. |
| `bff-proxy.ts` | `proxyToBff` for the two catch-all routes, and `clearSession`. |
| `faq.ts` | Help & FAQ content; quotes live config (warning and idle seconds) so answers cannot drift. |
| `legal.ts` | Terms of Use and Privacy Policy text, with operator details read from config. |
