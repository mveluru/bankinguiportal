# API routes (`app/api/`)

Thin controllers: parse the request, call a `lib/` module, audit, respond. Authenticated handlers verify the session
themselves; `/api/admin/*` uses `requireAdmin` (`lib/admin.ts`), which is the real admin access control (the nav
link is only convenience).
