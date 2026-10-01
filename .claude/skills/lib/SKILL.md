---
name: lib
description: Rules for lib/: client-safe vs server-only files, the backend client and proxy helpers, cookie session, types. Use when adding or editing anything in lib/.
---

# Library (`lib/`)

**Job:** everything non-visual. Two kinds of file, and the difference matters.

**Client-safe** (no `node:` or `next/headers` imports; safe to import from components): `types.ts`, `api.ts`, `format.ts`,
`duration.ts`, `navigation.ts`, `http-error.ts`, `passwords.ts`, `session.ts`.

**Server-only** (import only from route handlers and server components): `backend.ts`, `bff-proxy.ts`, plus `faq.ts` and
`legal.ts` (read env at render time).

Rules:
- Never import a server-only file from a `"use client"` component. If a client needs a type or constant from one, put it in a
  client-safe file.
- `lib/types.ts` mirrors the backend DTOs. Change it only when the backend DTO changes.
- `lib/api.ts` is the only place the browser reaches the backend, and only through `/api/portal/*` or `/api/staff/*`. Add new
  calls there and in the endpoint table of `backend-integration.md`.
- Irreversible or side-effecting calls (`closeAccount`, `getStatement`, which emails/SMSes) must only run on an explicit user action.
- The portal stores nothing on disk. Do not add `.data/` files, a local user store or an audit log.

### Per-file rules

| File | Rules |
|---|---|
| `session.ts` | Cookie names and options, `decodeToken` (does NOT verify the signature: routing and display only, never an access decision), `tokenKind`. Must stay edge-safe (no node imports) because `proxy.ts` imports it. |
| `backend.ts` | The only code that calls the backend. Always sends `X-Customer-Id` (the gateway requires it) and `no-store`; adds Bearer only when there is a token. Reads `BANKING_BACKEND_URL`, `BFF_PORTAL_PATH`, `BFF_STAFF_PATH` at runtime. |
| `bff-proxy.ts` | See the api-routes skill for the guards it must keep. |
| `passwords.ts` | Mirrors the backend's "exactly 8 digits" rule; the backend still validates. |
| `http-error.ts` | One place that turns the backend's two error shapes into a message. |
| `faq.ts`, `legal.ts` | User-facing text quoting live config. Update `LAST_UPDATED` in `legal.ts` on any wording change, and keep both in step with real behaviour (what is stored, which cookies, session length). |
| `format.ts`, `duration.ts`, `navigation.ts` | Small pure helpers; keep them dependency-free and client-safe. |
