---
name: pages
description: Rules for changing screens under app/**/page.tsx in the banking UI portal (server vs client pages, public pages, loading and error states). Use when adding or editing a page.
---

# Pages (`app/**/page.tsx`)

**Job:** one screen per route. Fetch or receive data, lay it out, hand actions to `lib/api.ts` or `/api/*`.

Rules:
- Server component by default. Add `"use client"` only when the page needs state, effects, browser APIs or event
  handlers (forms, anything calling `useAuth`).
- Content pages (`/terms`, `/privacy`, `/help`) stay server components fed by `lib/legal.ts` / `lib/faq.ts`.
- Public pages must be listed in `PUBLIC_PAGES` in `proxy.ts`, or signed-out visitors are redirected to `/login`.
- Show loading and errors with `StateBlock` (`Loading`, `ErrorMessage`), not ad-hoc markup.
- A new page needs a nav or settings link and a row in the README screen table.
- Dynamic segments use `[accountNumber]`; read them with `useParams` (client) or `params` (server).
