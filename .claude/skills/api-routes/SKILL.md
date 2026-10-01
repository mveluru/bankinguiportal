---
name: api-routes
description: Rules for route handlers under app/api (sign-in/out, the BFF proxies, cookies, status codes). Use when adding or editing an API route.
---

# API routes (`app/api/**/route.ts`)

**Job:** thin glue between the browser and the banking backend: `auth/{login,logout,me}` and the catch-all proxies
`portal/[...path]` and `staff/[...path]`. No business rules: the backend decides who may do what.

Rules:
- The backend JWT lives only in the httpOnly `bank_token` cookie. Never return it in a body, log it, or put it in a URL. Sign-in
  returns just the profile.
- A new backend call needs **no new route**: the catch-all proxies forward any path under `/bff/v1/portal` or `/bff/v1/staff`.
  Add a route only for something the proxy must not do (like sign-in, which sets cookies).
- Keep the proxy's guards (`lib/bff-proxy.ts`): refuse `.`/`..` segments, refuse `login`, refuse a cross-site `Origin`, pass
  status and body through unchanged, clear the cookies on a 401 and after a successful `PUT .../password`.
- Do not decide permissions here (no role checks): pass the backend's 401/403/423 messages through. The UI hides actions
  as a convenience only.
- Pass the backend's message through as `{ message }` JSON on errors you generate yourself (400 bad input, 502 backend down).
- Never log passwords, security answers or tokens.
