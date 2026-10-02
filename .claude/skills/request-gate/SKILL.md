---
name: request-gate
description: Rules for proxy.ts, next.config.ts, env vars, layout.tsx and globals.css in the banking UI portal. Use when changing routing gates, config or global styling.
---

# Request gate and config

- **`proxy.ts`:** reads the token cookie's type and expiry (`tokenKind`, no signature check) and routes: a customer is kept on
  customer pages, an employee on `/staff/*`, everyone else goes to `/login` or `/staff/login` (with `?next=`). Public pages and
  the two sign-in pages are special-cased. Add new public pages to `PUBLIC_PAGES`. It does not apply to `/api/*`: the backend is
  the real access control. Never trust it, or the decoded token, for an access decision.
- **`next.config.ts`:** empty on purpose. The browser calls only same-origin `/api/*` handlers, so nothing is rewritten.
- **`.env.local.brite` (and the staging/prod templates):** every env var with its default. Add new ones there and in the README.
  `BANKING_BACKEND_URL`, `BFF_PORTAL_PATH`, `BFF_STAFF_PATH` are server-side, read at start. `NEXT_PUBLIC_*` are baked in at build.
- **`app/layout.tsx`:** wraps the app in `AuthProvider` and renders `NavBar`, `SessionTimeout`, `IdleLogout`, `CookieNotice`
  and the footer, plus the pre-paint theme script. Keep it free of page-specific logic.
- **`app/globals.css`:** all styling, with CSS variables for light and dark. Reuse existing classes first. Everything must stay responsive: use fluid widths, put phone rules in the `@media (max-width: 640px)` block, and never add a fixed width that exceeds a 320px screen.
