---
name: request-gate
description: Rules for proxy.ts, next.config.ts, env vars, layout.tsx and globals.css in the banking UI portal. Use when changing routing gates, rewrites, config or global styling.
---

# Request gate and config

- **`proxy.ts`:** verifies the session cookie for every matched request. Public pages and `/login*` are special-cased;
  everything else redirects to `/login` (pages) or returns 401 (`/api/*`). Add new public pages to `PUBLIC_PAGES`.
  Signed-in non-admins requesting `/admin` or `/admin/*` are redirected to `/`; the role comes from `roleOf` (configuration),
  not the token. New admin-only pages live under `/admin` so they are covered, and their API routes must still call
  `requireAdmin`.
- **`next.config.ts`:** rewrites `/api/banking/*` to `BANKING_BACKEND_URL` because the backend only enables CORS on
  `/bff/**`. New non-BFF backend endpoints go through this rewrite.
- **`.env.local.example`:** every env var, with its default. Add new ones here and in the README.
- **`app/layout.tsx`:** wraps the app in `AuthProvider` and renders `NavBar`, `SessionTimeout`, `CookieNotice` and the
  footer, plus the pre-paint theme script. Keep it free of page-specific logic.
- **`app/globals.css`:** all styling, with CSS variables for light and dark. Reuse existing classes first.
